import React from 'react'

type LexicalTextNode = { type: 'text'; text: string; format?: number }
type LexicalLinkNode = { type: 'link'; fields?: { url?: string; newTab?: boolean }; children: LexicalNode[] }
type LexicalParagraphNode = { type: 'paragraph'; children: LexicalNode[] }
type LexicalHeadingNode = { type: 'heading'; tag?: string; children: LexicalNode[] }
type LexicalListNode = { type: 'list'; tag?: 'ul' | 'ol'; children: LexicalListItemNode[] }
type LexicalListItemNode = { type: 'listitem'; children: LexicalNode[] }
type LexicalLineBreak = { type: 'linebreak' }
type LexicalNode =
  | LexicalTextNode
  | LexicalLinkNode
  | LexicalParagraphNode
  | LexicalHeadingNode
  | LexicalListNode
  | LexicalListItemNode
  | LexicalLineBreak
  | { type: string; children?: LexicalNode[] }

type LexicalRoot = { root?: { children?: LexicalNode[] } }

function renderText(node: LexicalTextNode, key: number): React.ReactNode {
  let content: React.ReactNode = node.text
  const format = node.format ?? 0
  if (format & 1) content = <strong key={`s${key}`}>{content}</strong>
  if (format & 2) content = <em key={`i${key}`}>{content}</em>
  if (format & 8) content = <u key={`u${key}`}>{content}</u>
  if (format & 4) content = <s key={`st${key}`}>{content}</s>
  return <React.Fragment key={key}>{content}</React.Fragment>
}

function renderChildren(children: LexicalNode[] | undefined): React.ReactNode[] {
  if (!children) return []
  return children.map((child, i) => renderNode(child, i))
}

function renderNode(node: LexicalNode, key: number): React.ReactNode {
  if (!node || typeof node !== 'object') return null
  switch (node.type) {
    case 'text':
      return renderText(node as LexicalTextNode, key)
    case 'paragraph': {
      const kids = renderChildren((node as LexicalParagraphNode).children)
      if (!kids.length || kids.every((k) => !k)) return <p key={key}>&nbsp;</p>
      return <p key={key}>{kids}</p>
    }
    case 'heading': {
      const tag = (node as LexicalHeadingNode).tag || 'h2'
      return React.createElement(tag, { key }, renderChildren((node as LexicalHeadingNode).children))
    }
    case 'list': {
      const n = node as LexicalListNode
      const Tag = n.tag === 'ol' ? 'ol' : 'ul'
      return <Tag key={key}>{renderChildren(n.children)}</Tag>
    }
    case 'listitem':
      return <li key={key}>{renderChildren((node as LexicalListItemNode).children)}</li>
    case 'linebreak':
      return <br key={key} />
    case 'link': {
      const link = node as LexicalLinkNode
      const href = link.fields?.url ?? '#'
      return (
        <a
          key={key}
          href={href}
          {...(link.fields?.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {renderChildren(link.children)}
        </a>
      )
    }
    default: {
      const anyNode = node as { children?: LexicalNode[] }
      if (anyNode.children) return <React.Fragment key={key}>{renderChildren(anyNode.children)}</React.Fragment>
      return null
    }
  }
}

export function RichText({ content }: { content: LexicalRoot | null | undefined }) {
  const children = content?.root?.children
  if (!children?.length) return null
  return <>{renderChildren(children)}</>
}

export function richTextToPlainString(content: LexicalRoot | null | undefined, max = 200): string {
  if (!content?.root?.children) return ''
  const parts: string[] = []
  const walk = (nodes: LexicalNode[]) => {
    for (const n of nodes) {
      if (!n) continue
      if (n.type === 'text') parts.push((n as LexicalTextNode).text)
      const kids = (n as { children?: LexicalNode[] }).children
      if (kids) walk(kids)
    }
  }
  walk(content.root.children)
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (joined.length <= max) return joined
  return joined.slice(0, max - 1).trim() + '…'
}
