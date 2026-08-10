import { SettingsRepository } from "@/lib/repositories/settings-repository";

const settingsRepo = new SettingsRepository();

const DEFAULT_NAVIGATION = [
  { id: "nav_1", label: "Shop All", href: "/shop", visible: true, is_external: false, sort_order: 1 },
  { id: "nav_2", label: "Customizer", href: "/customize", visible: true, is_external: false, sort_order: 2 },
  { id: "nav_3", label: "About Us", href: "/about", visible: true, is_external: false, sort_order: 3 },
  { id: "nav_4", label: "Contact", href: "/contact", visible: true, is_external: false, sort_order: 4 },
  { id: "nav_5", label: "FAQ", href: "/faq", visible: true, is_external: false, sort_order: 5 },
];

export class SettingsService {
  async getSetting(key: string) {
    return await settingsRepo.get(key);
  }

  async listSettings(category?: string) {
    return await settingsRepo.list(category);
  }

  async setSetting(key: string, value: any, category?: string, description?: string) {
    return await settingsRepo.set(key, value, category, description);
  }

  async deleteSetting(key: string) {
    return await settingsRepo.delete(key);
  }

  async getNavigation() {
    const nav = await settingsRepo.get("navigation_config");
    return nav ?? DEFAULT_NAVIGATION;
  }

  async setNavigation(navigation: any[]) {
    const updated = await settingsRepo.set("navigation_config", navigation, "cms", "Navigation items configuration");
    return updated.value;
  }

  async getTheme() {
    const DEFAULT_THEME = {
      primary_color: "#FFB200",
      secondary_color: "#E5261F",
      accent_color: "#FF5A1F",
      mode: "dark",
      font_sans: "Inter",
      font_display: "Space Grotesk",
      border_radius: "0.75rem",
    };
    const theme = await settingsRepo.get("theme_config");
    return theme ?? DEFAULT_THEME;
  }

  async setTheme(theme: any) {
    const updated = await settingsRepo.set("theme_config", theme, "branding", "Theme & branding configuration");
    return updated.value;
  }
}
