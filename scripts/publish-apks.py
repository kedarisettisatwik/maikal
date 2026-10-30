"""Publish the two existing APKs to an explicit GitHub release, using Git credentials in memory."""
import argparse, hashlib, json, os, subprocess, urllib.request, urllib.error
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--tag', required=True)
args = parser.parse_args()
repo = 'kedarisettisatwik/maikal'
files = [Path('APK/Maikal-Local.apk'), Path('APK/Maikal-Firebase.apk')]
if not all(p.is_file() for p in files):
    raise SystemExit('Build both APKs before publishing.')
credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'never'}, timeout=30)
values = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
token = values.get('password')
if credential.returncode or not token:
    raise SystemExit('GitHub authentication is unavailable.')

def api(method, endpoint, payload=None, data=None):
    body = data if data is not None else json.dumps(payload).encode() if payload is not None else None
    url = endpoint if endpoint.startswith('https://') else 'https://api.github.com/repos/' + repo + endpoint
    request = urllib.request.Request(url, data=body, method=method, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'Maikal-Publisher', 'Content-Type': 'application/vnd.android.package-archive' if data is not None else 'application/json'})
    with urllib.request.urlopen(request, timeout=180) as response:
        content = response.read()
        return json.loads(content) if content else {}

try:
    try:
        release = api('GET', '/releases/tags/' + args.tag)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        release = api('POST', '/releases', {'tag_name': args.tag, 'target_commitish': 'main', 'name': 'Maikal Android ' + args.tag.removeprefix('android-v'), 'body': 'Selectable home-screen Notes widget, direct note opening, clickable links, checklists and Android sharing. Both editions display the app name Maikal. Local stores data on the device; Firebase supports the authorized cloud account. Debug APKs for direct installation on Android 8.0+. Install over the matching existing edition to preserve data.', 'draft': True, 'prerelease': False})
    assets = {asset['name']: asset for asset in release.get('assets', [])}
    downloads = []
    for file in files:
        data = file.read_bytes()
        digest = 'sha256:' + hashlib.sha256(data).hexdigest()
        asset = assets.get(file.name)
        if asset:
            if asset.get('digest') != digest:
                raise RuntimeError('Existing release asset differs: ' + file.name + '. No asset was replaced.')
        else:
            asset = api('POST', release['upload_url'].split('{')[0] + '?name=' + file.name, data=data)
        if asset['size'] != len(data) or asset.get('digest') not in (None, digest):
            raise RuntimeError('APK upload verification failed: ' + file.name)
        downloads.append({'name': file.name, 'url': asset['browser_download_url'], 'bytes': asset['size']})
    if release['draft']:
        release = api('PATCH', '/releases/' + str(release['id']), {'draft': False, 'make_latest': 'true'})
    published = api('GET', '/releases/' + str(release['id']))
    downloads = [{'name': asset['name'], 'url': asset['browser_download_url'], 'bytes': asset['size']} for asset in published['assets'] if asset['name'] in {file.name for file in files}]
    print(json.dumps({'release': release['html_url'], 'downloads': downloads}))
except urllib.error.HTTPError as error:
    raise SystemExit('GitHub release request failed: HTTP ' + str(error.code)) from None
except Exception as error:
    raise SystemExit(str(error)) from None
