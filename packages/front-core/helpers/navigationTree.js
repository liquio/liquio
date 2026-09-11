import { getTranslationCandidates } from "helpers/localization";

const normalizeNavigationPath = (path) => {
  if (typeof path !== "string" || !path.length) {
    return "";
  }

  return path.replace(/\/+$/, "") || "/";
};

const resolveItemPath = (basePath, itemPath) => {
  if (typeof itemPath !== "string" || !itemPath.length) {
    return normalizeNavigationPath(basePath);
  }

  if (itemPath.startsWith("/")) {
    return normalizeNavigationPath(itemPath);
  }

  const normalizedBasePath = normalizeNavigationPath(basePath);
  return normalizeNavigationPath(
    `${normalizedBasePath === "/" ? "" : normalizedBasePath}/${itemPath}`,
  );
};

const resolveMenuTitle = (item, translationCandidates) => {
  const translations = item?.translations;

  if (translations && typeof translations === "object") {
    for (const candidate of translationCandidates) {
      if (
        typeof translations[candidate] === "string" &&
        translations[candidate].trim()
      ) {
        return translations[candidate];
      }
    }
  }

  return item?.name || "";
};

const findTitleByPath = (
  items,
  normalizedTargetPath,
  translationCandidates,
  parentPath = "",
) => {
  if (!Array.isArray(items)) {
    return "";
  }

  for (const item of items) {
    const itemPath = resolveItemPath(
      parentPath,
      item?.path || item?.options?.route || "",
    );

    if (itemPath && itemPath === normalizedTargetPath) {
      const itemTitle = resolveMenuTitle(item, translationCandidates);

      if (itemTitle) {
        return itemTitle;
      }
    }

    const childTitle = findTitleByPath(
      item?.children,
      normalizedTargetPath,
      translationCandidates,
      itemPath || parentPath,
    );

    if (childTitle) {
      return childTitle;
    }
  }

  return "";
};

export const getNavigationTitleByPath = (items, targetPath, languageCode) => {
  const normalizedTargetPath = normalizeNavigationPath(targetPath);

  if (!normalizedTargetPath) {
    return "";
  }

  const translationCandidates = getTranslationCandidates(languageCode);

  return findTitleByPath(items, normalizedTargetPath, translationCandidates);
};
