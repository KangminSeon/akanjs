export type SlateJson = any[];

export const extractTextFromSlateJson = (nodes: any[]): string => {
  return nodes
    .map((node: any | { text?: string }) => {
      // If the node is a text node, return its text content
      if ((node as { text?: string }).text !== undefined) {
        return (node as any).text;
      }

      if (!(node as { children?: unknown }).children) return "";
      // For non-text nodes (elements), recursively process their children

      const elementNode = node as any;
      const childText = extractTextFromSlateJson(elementNode.children);

      // Handle specific element types
      switch (elementNode.type) {
        case "p":
          return `${childText}\n`;
        case "h1":
          return `${childText}\n`;
        case "h2":
          return `${childText}\n`;
        case "h3":
          return `${childText}\n`;
        case "h4":
          return `${childText}\n`;
        case "h5":
          return `${childText}\n`;
        case "h6":
          return `${childText}\n`;
        case "li":
          return `- ${childText}\n`;
        case "blockquote":
          return `> ${childText}\n`;
        default:
          return childText;
      }
    })
    .join("");
};
