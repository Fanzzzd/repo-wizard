import {
  generateManifest,
  type Manifest,
} from "material-icon-theme";

type IconDefinition = {
  iconPath: string;
};

class IconService {
  private manifest: Manifest | undefined;

  constructor() {
    this.manifest = generateManifest();
  }

  private getIconDefinition(iconName: string): IconDefinition | undefined {
    if (!this.manifest?.iconDefinitions) return undefined;
    return this.manifest.iconDefinitions[iconName];
  }

  private getIconName(
    associations: Record<string, string> | undefined,
    key: string
  ): string | undefined {
    if (!associations) return undefined;
    return associations[key.toLowerCase()];
  }
  
  private stripSVGExtension(iconPath: string): string {
    return iconPath.replace(/\.svg$/, "");
  }

  public getIconNameForFile(filename: string): string {
    if (!this.manifest) return 'file';

    const lowerFilename = filename.toLowerCase();
    const fileExtension = "." + lowerFilename.split(".").pop();

    const iconFromFileName = this.getIconName(this.manifest.fileNames, lowerFilename);
    if (iconFromFileName) {
      const def = this.getIconDefinition(iconFromFileName);
      if (def) return this.stripSVGExtension(def.iconPath);
    }

    const iconFromFileExt = this.getIconName(this.manifest.fileExtensions, fileExtension.substring(1));
    if (iconFromFileExt) {
      const def = this.getIconDefinition(iconFromFileExt);
      if (def) return this.stripSVGExtension(def.iconPath);
    }
    
    if (this.manifest.file) {
      const def = this.getIconDefinition(this.manifest.file);
      return def ? this.stripSVGExtension(def.iconPath) : 'file';
    }
    return 'file';
  }

  public getIconNameForFolder(folderName: string, isOpen: boolean): string {
    if (!this.manifest) return isOpen ? 'folder-open' : 'folder';

    const lowerFolderName = folderName.toLowerCase();
    const manifest = this.manifest;

    const iconName = isOpen
      ? this.getIconName(manifest.folderNamesExpanded, lowerFolderName) ?? this.getIconName(manifest.folderNames, lowerFolderName)
      : this.getIconName(manifest.folderNames, lowerFolderName) ?? this.getIconName(manifest.folderNamesExpanded, lowerFolderName);
      
    if (iconName) {
      const def = this.getIconDefinition(iconName);
      if (def) return this.stripSVGExtension(def.iconPath);
    }

    const defaultIconName = isOpen ? manifest.folderExpanded : manifest.folder;
    if (defaultIconName) {
      const def = this.getIconDefinition(defaultIconName);
      return def ? this.stripSVGExtension(def.iconPath) : (isOpen ? 'folder-open' : 'folder');
    }
    return isOpen ? 'folder-open' : 'folder';
  }
}

export const iconService = new IconService();