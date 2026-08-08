import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Layers,
  FileText,
  Quote,
  BarChart3,
  Building2,
  DatabaseBackup,
  PlusCircle,
  Wrench,
  ChevronDown,
  CalendarCheck,
  Wallet,
  HandCoins,
  Construction,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Main Menu',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
      {
        label: 'Bill',
        icon: FileText,
        children: [
          { label: 'Invoices', path: '/invoices', icon: FileText },
          { label: 'Quotations', path: '/quotations', icon: Quote },
        ],
      },
      { label: 'Clients', path: '/clients', icon: Users },
      {
        label: 'Employees',
        icon: UsersRound,
        children: [
          { label: 'Employee List', path: '/employees', icon: Users },
          { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
          { label: 'Salary', path: '/salary', icon: Wallet },
          { label: 'Advances', path: '/advances', icon: HandCoins },
        ],
      },
      {
        label: 'Projects / Sites',
        icon: Construction,
        children: [
          { label: 'All Projects', path: '/projects', icon: Construction, end: true },
          { label: 'Active Projects', path: '/projects/active', icon: CheckCircle2 },
          { label: 'Work History', path: '/work-history', icon: ListChecks },
        ],
      },
      { label: 'Rate Master', path: '/rates', icon: Layers },
      { label: 'Reports & GST', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Company Settings', path: '/company', icon: Building2 },
      { label: 'Backup & Restore', path: '/backup', icon: DatabaseBackup },
    ],
  },
];

/** Warms the API cache on hover so the page is already loaded when clicked. */
const prefetch = (path) => {
  try {
    const fy = localStorage.getItem('khodiyar_selected_fy') || 'ALL';
    if (path === '/invoices') api.get(`/invoices?financialYearId=${fy}&status=ALL&gstType=ALL&search=&limit=20`);
    else if (path === '/quotations') api.get(`/quotations?financialYearId=${fy}&search=&limit=20`);
    else if (path === '/clients') api.get(`/clients?financialYearId=${fy}&search=&limit=20`);
    else if (path === '/rates') api.get('/rates?search=');
    else if (path === '/employees') api.get('/employees?status=ACTIVE&search=&limit=20');
    else if (path === '/attendance') api.get('/attendance?status=ACTIVE&search=');
    else if (path === '/salary') api.get('/salary?status=ACTIVE&search=');
    else if (path === '/advances') api.get('/advances?search=');
    else if (path === '/projects') api.get('/projects?status=ALL&search=&limit=20');
    else if (path === '/projects/active') api.get('/projects?status=ACTIVE&search=&limit=20');
    else if (path === '/work-history') api.get('/worklogs?limit=20');
  } catch (e) {}
};

/** A top-level nav item that expands into a submenu instead of navigating itself. */
const CollapsibleGroupItem = ({ item, isActive, closeOnMobile }) => {
  const { state: sidebarState, setOpen: setSidebarOpen } = useSidebar();
  const Icon = item.icon;
  const isChildActive = item.children.some((child) => isActive(child));
  const [open, setOpen] = useState(isChildActive);

  // Auto-expand when a child becomes active (e.g. the header's "Create
  // Invoice" CTA navigating to /invoices/new) — but never auto-collapse, so a
  // manual expand/collapse survives unrelated navigation.
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  const handleTriggerClick = () => {
    if (sidebarState === 'collapsed') {
      // Icon-only rail: expand the whole sidebar first so the submenu is visible.
      setSidebarOpen(true);
      setOpen(true);
      return;
    }
    setOpen((prev) => !prev);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={handleTriggerClick}
        isActive={isChildActive}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
        <ChevronDown className={`ml-auto size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </SidebarMenuButton>

      {open && (
        <SidebarMenuSub>
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <SidebarMenuSubItem key={child.path}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActive(child)}
                >
                  <NavLink
                    to={child.path}
                    onClick={closeOnMobile}
                    onMouseEnter={() => prefetch(child.path)}
                  >
                    <ChildIcon />
                    <span>{child.label}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
};

export const AppSidebar = (props) => {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Selecting an item should dismiss the mobile sheet, but must not touch the
  // desktop collapsed/expanded state (that's the user's persisted preference).
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);

  return (
    <SidebarRoot collapsible="icon" {...props}>
      <SidebarHeader className="gap-2">
        {/* Brand — collapses to just the mark in icon mode. */}
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/25">
            <Wrench className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-extrabold text-sidebar-foreground">
              Khodiyar Steel
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              Fabrication Management
            </span>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Create Invoice"
              className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-600/25
                         hover:from-brand-500 hover:to-indigo-500 hover:text-white
                         active:from-brand-500 active:to-indigo-500 active:text-white
                         focus-visible:ring-sidebar-ring"
            >
              <NavLink
                to="/invoices/new"
                onClick={closeOnMobile}
                onMouseEnter={() => prefetch('/invoices')}
              >
                <PlusCircle />
                <span className="font-semibold">Create Invoice</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.children) {
                    return (
                      <CollapsibleGroupItem
                        key={item.label}
                        item={item}
                        isActive={isActive}
                        closeOnMobile={closeOnMobile}
                      />
                    );
                  }

                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item)}
                        tooltip={item.label}
                      >
                        <NavLink
                          to={item.path}
                          end={item.end}
                          onClick={closeOnMobile}
                          onMouseEnter={() => prefetch(item.path)}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="font-semibold text-sidebar-foreground">
            Khodiyar Steel Fabrication v1.0
          </div>
          <div>Owner Admin Access Only</div>
        </div>
      </SidebarFooter>

      {/* Drag handle / click target on the sidebar edge to collapse. */}
      <SidebarRail />
    </SidebarRoot>
  );
};
