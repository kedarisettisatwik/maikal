import { assetUrl } from '../assets';

export default function ActionIconButton({ action, label, onClick, className = 'mini' }) {
  return <button type="button" className={`${className} action-icon`} onClick={onClick} aria-label={label} title={label}>
    <img src={assetUrl(`ui-icons/${action === 'edit' ? 'pencil-simple' : 'trash'}.svg`)} alt="" aria-hidden="true" />
  </button>;
}
