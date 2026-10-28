import toast from 'react-hot-toast';

export function notify(message) {
  return toast(message, { toasterId: document.querySelector('dialog[open]') ? 'dialog' : 'default' });
}
