import { NavLink, Outlet } from "react-router-dom";

export const Header = () => (
  <>
    <header className="h-12 shrink-0 flex items-center gap-1 px-4 border-b border-gray-200 bg-white shadow-sm z-20">
      <NavLink
        to="/"
        end
        className={({ isActive }: { isActive: boolean }) =>
          `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`
        }
      >
        Routes
      </NavLink>
      <NavLink
        to="/cities"
        className={({ isActive }: { isActive: boolean }) =>
          `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`
        }
      >
        Cities
      </NavLink>
    </header>
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <Outlet />
    </div>
  </>
);
