export type UserRole = 'public' | 'admin';

export const DEFAULT_ADMIN_PIN = '17881520';

/**
 * Validates entered PIN against the stored PIN (default '17881520')
 */
export function verifyAdminPin(enteredPin: string, storedPin: string = DEFAULT_ADMIN_PIN): boolean {
  return enteredPin.trim() === storedPin.trim();
}

/**
 * Checks whether current role has administrative permissions
 */
export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Filter navigation tabs based on user role
 */
export function getAllowedTabs(role: UserRole): Array<'dashboard' | 'calendar' | 'rekap' | 'students'> {
  if (role === 'admin') {
    return ['dashboard', 'calendar', 'rekap', 'students'];
  }
  // Public users get simplified and safe views
  return ['dashboard', 'calendar', 'rekap'];
}
