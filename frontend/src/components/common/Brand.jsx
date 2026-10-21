import { Link, useLocation } from 'react-router-dom';
import { getAccessToken } from '../../api/client';

export default function Brand() {
  const { pathname } = useLocation();
  const logged = !!getAccessToken();
  const isAstrologer = pathname.startsWith('/astrologer');

  const home = !logged ? '/user/contents/free-information'
    : isAstrologer ? '/astrologer/dashboard'
    : '/user/dashboard';

  return (
    <Link className="brand" to={home}>
      <span className="brand-mark">✦</span>
      <span>Cosmic<span>Connect</span></span>
    </Link>
  );
}
