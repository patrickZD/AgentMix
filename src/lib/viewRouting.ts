import type { AppView } from '@/types';

// Resolve which view to render. With no source project loaded the app always
// shows the welcome screen (the empty state); once the first project is added
// the user's chosen view (main / health-check / merge-workbench) takes over.
export function resolveView(projectCount: number, view: AppView): AppView {
  return projectCount === 0 ? 'welcome' : view;
}
