---
title: Hello
meta:
  - name: description
    content: Hello World
test: test
---

<route lang="yaml">
meta:
  foo: "bar"
</route>

## Installation

The installation of `vite-plugin-md` is quite simple once you've setup ViteJS:

```sh
// use your favorite package manager
npm i -D vite-plugin-md
```

## Usage

fill in

### Frontmatter Metadata

You can add in meta-data to the top of your markdown using the standard convention of Frontmatter which demarcates the beginning/end of the meta data with `---` markers.

The frontmatter for this page is:

```!#json heading="frontmatter"
{{ frontmatter }}
```

> Note: while it is represented here as a JSON structure, in the markdown you would add in YAML syntax.

## Builders

The base functionality of this plugin may be all you need or maybe your comfortable with using **markdown it** plugins to extend the base functionality for your needs ... but for those who want to reach into some useful "power ups" you can use a builder to add functionality in powerful ways:

- [Meta](./meta-builder)
- [Link](./link-builder)
- [Meta](./meta-builder)

## VueJS Components

You can embed VueJS components into your markdown where ever you like:

<Counter />

<router-link to="/">Home</router-link>

<route>
{
  meta: {
    layout: 'home'
  }
}
</route>
