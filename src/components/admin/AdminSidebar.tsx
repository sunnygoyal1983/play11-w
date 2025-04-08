import Link from 'next/link';
import { FaExclamationCircle } from 'react-icons/fa';

// Look for the navigation items array, likely with entries like 'Dashboard', 'Users', etc.
// Add the new prize monitor link in the appropriate section

{
  /* Add this new section */
}
<li>
  <Link
    href="/admin/prize-monitor"
    className={`flex items-center text-sm py-2 px-4 font-medium rounded hover:bg-gray-200 ${
      pathname === '/admin/prize-monitor' ? 'bg-gray-200' : ''
    }`}
  >
    <FaExclamationCircle className="mr-3" />
    Prize Monitor
  </Link>
</li>;
{
  /* End of new section */
}
