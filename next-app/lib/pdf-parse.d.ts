/**
 * Type declaration for pdf-parse (no official types; buffer in, returns { text: string }).
 */
declare module "pdf-parse" {
  function pdf(buffer: Buffer): Promise<{ text: string; numpages?: number }>;
  export default pdf;
}
