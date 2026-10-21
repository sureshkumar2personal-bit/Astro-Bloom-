export default function Notice({ message, id }) {
  return message ? <div className="notice" role="alert" id={id} aria-live="assertive">{message}</div> : null;
}
