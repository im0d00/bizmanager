import { create } from 'zustand';

const getStoredDarkMode = () => {
  try {
    return localStorage.getItem('darkMode') === 'true';
  } catch {
    return false;
  }
};

export const useAppStore = create((set, get) => ({
  darkMode: getStoredDarkMode(),
  sidebarOpen: true,
  notifications: [],
  settings: {},
  confirm: null,

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem('darkMode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: next });
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  addNotification: (notification) => {
    const id = Date.now().toString();
    const n = { id, ...notification };
    set(s => ({ notifications: [...s.notifications, n] }));
    setTimeout(() => {
      set(s => ({ notifications: s.notifications.filter(x => x.id !== id) }));
    }, 5000);
  },

  removeNotification: (id) => {
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }));
  },

  setSettings: (settings) => set({ settings }),

  showConfirm: ({ title, message }) => {
    return new Promise((resolve) => {
      set({
        confirm: {
          title,
          message,
          onConfirm: () => {
            set({ confirm: null });
            resolve(true);
          },
          onCancel: () => {
            set({ confirm: null });
            resolve(false);
          }
        }
      });
    });
  }
}));
