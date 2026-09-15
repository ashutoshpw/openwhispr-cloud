// @aws-lite/s3 ships no bundled type declarations in the pinned version;
// the plugin is loaded dynamically and only its default export is used.
declare module "@aws-lite/s3" {
  const s3Plugin: Record<string, unknown> &
    ((config?: Record<string, unknown>) => unknown);
  export default s3Plugin;
}
