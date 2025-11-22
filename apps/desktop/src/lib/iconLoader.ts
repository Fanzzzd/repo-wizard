// Use query: '?url' to ensure we get the asset URL
const icons = import.meta.glob('../../node_modules/material-icon-theme/icons/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

export function getIconUrl(iconName: string): string | undefined {
    const normalizedName = iconName.split('/').pop();
    if (!normalizedName) return undefined;

    const key = `../../node_modules/material-icon-theme/icons/${normalizedName}.svg`;
    return icons[key];
}
