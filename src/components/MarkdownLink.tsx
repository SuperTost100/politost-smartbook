import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';

/**
 * Links in the legal pages and the guide point at app routes (`/privacy`). A plain <a> would
 * drop the base path when the reader runs in a subfolder, so app routes go through the router.
 */
export function MarkdownLink({ href, children, node: _node, ...rest }: ComponentProps<'a'> & { node?: unknown }) {
  if (href?.startsWith('/') && !href.startsWith('//')) {
    return <Link to={href} {...rest}>{children}</Link>;
  }
  return <a href={href} {...rest}>{children}</a>;
}
