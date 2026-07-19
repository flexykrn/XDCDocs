import type {PrismTheme} from 'prism-react-renderer';

const codeBg = '#0a1428';
const creamText = '#f8f1e7';
const mutedComment = '#7d8ba3';
const blue = '#5b8def';
const purple = '#b48ef0';
const teal = '#3fd0c9';
const amber = '#e8b04b';
const red = '#f2707f';

export const prismXdcLight: PrismTheme = {
  plain: {
    color: creamText,
    backgroundColor: codeBg,
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {color: mutedComment, fontStyle: 'italic'},
    },
    {
      types: ['punctuation'],
      style: {color: '#a8b3c7'},
    },
    {
      types: ['keyword', 'tag', 'important', 'atrule', 'rule'],
      style: {color: purple},
    },
    {
      types: ['string', 'char', 'attr-value', 'regex'],
      style: {color: teal},
    },
    {
      types: ['function', 'function-variable', 'class-name', 'maybe-class-name'],
      style: {color: blue},
    },
    {
      types: ['number', 'boolean', 'constant', 'symbol', 'unit'],
      style: {color: amber},
    },
    {
      types: ['property', 'attr-name', 'variable', 'selector'],
      style: {color: creamText},
    },
    {
      types: ['operator'],
      style: {color: '#8fa3c8', background: 'transparent'},
    },
    {
      types: ['builtin', 'namespace', 'url'],
      style: {color: blue},
    },
    {
      types: ['deleted'],
      style: {color: red},
    },
    {
      types: ['inserted'],
      style: {color: teal},
    },
    {
      types: ['bold'],
      style: {fontWeight: 'bold'},
    },
    {
      types: ['italic'],
      style: {fontStyle: 'italic'},
    },
  ],
};

export const prismXdcDark: PrismTheme = prismXdcLight;
