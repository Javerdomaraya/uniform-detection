import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from 'react-router-dom';
import { 
  Monitor, 
  BarChart3, 
  Users, 
  Info, 
  LogOut, 
  Shield,
  UserCheck,
  Camera,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminItems = [
  { title: 'Live Monitor', url: '/admin', icon: Monitor },
  { title: 'Review Violations', url: '/admin/review-violations', icon: AlertTriangle },
  { title: 'Reports', url: '/admin/reports', icon: BarChart3 },
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'About', url: '/about', icon: Info },
];

const securityItems = [
  { title: 'Live Monitor', url: '/security', icon: Monitor },
  { title: 'Identify Violations', url: '/security/identify-violations', icon: AlertCircle },
  { title: 'Compliance Logs', url: '/security/logs', icon: UserCheck },
  { title: 'About', url: '/about', icon: Info },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;

  const role = user?.profile?.role;
  const items = role === 'admin' ? adminItems : securityItems;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'hover:bg-sidebar-accent/50';

  return (
    <Sidebar className={`${!open ? 'w-14' : 'w-60'} bg-gradient-to-b from-sidebar to-sidebar/90`} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar-accent/10">
        <div className="flex items-center gap-3">
          <img 
            src="/Bipsu_new.png" 
            alt="BiPSU Logo" 
            className="h-9 w-9 object-contain flex-shrink-0"
          />
          {open && (
            <div>
              <h2 className="font-bold text-sidebar-foreground text-lg">BIPSU</h2>
              <p className="text-xs text-sidebar-foreground/70">Compliance System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <Shield className="h-4 w-4" />
            {open && (role === 'admin' ? 'Administrator' : 'Security Personnel')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={`transition-all duration-200 ${
                          active 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-4 border-primary' 
                            : 'hover:bg-sidebar-accent/50'
                        } ${!open ? 'justify-center' : ''}`}
                        title={!open ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {open && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-accent/10">
        <div className="flex items-center gap-3">
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.profile?.full_name || user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {role}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="flex-shrink-0 h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}