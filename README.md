# Hyperapp Map

This is a utility for [Hyperapp](https://hyperapp.dev) (v2.0.3 and above). It lets you structure your app by composing self-contained, reusable modules with minimal boilerplate, while staying true to the single-state, one-way-data-flow paradigm.

## Installation

### Minified IIFE from CDN in script tag

Add this script tag to your HTML

```html
<script src="https://unpkg.com/hyperapp-map/dist/hyperappmap.js"></script>
```

It will export `hyperappmap` in your global scope. It is an object containing the exported functions:

```js
const { makeMap, mapVNode, mapPass, mapSubs } = hyperappmap
```

### Import as ES module from CDN

Import directly to your scripts from CDB:

```js
import {
    makeMap,
    mapVNode,
    mapPass,
    mapSubs,
} from 'https://unpkg.com/hyperapp-map'
```

### Install into bundled project from npm

If you're bundling your app, you can install the package via

```
npm i hyperapp-map
```

And then import in your scripts like this:

```js
import { makeMap, mapVNode, mapPass, mapSubs } from 'hyperapp-map'
```

## Introduction by Example

Let's say you defined a self contained counter module:

```js
const init = 0

export const Increment = state => state + 1
export const Decrement = state => state - 1

export const view = state =>
    h('p', {}, [
        h('button', { onclick: Decrement }, '-'),
        state,
        h('button', { onclick: Increment }, '+'),
    ])
```

Now you want to integrate it as a part of a larger app with other moving parts:

`app.js`

```js
import * as foo from './foo.js'
import * as counter from './counter.js'

app({
    init: {
        foo: foo.init,
        counter: counter.init,
    },
    view: state =>
        h('main', {}, [foo.view(state.foo), counter.view(state.counter)]),
    node: document.getElementById('app'),
})
```

Unfortunately, that won't work, because the state given to the counter actions (`Increment`, for example) will be the app's full state `{foo: ..., counter: 0}` - not simply the expected `0`.

The counter actions would need to be defined as:

```js
const Increment = state => ({ ...state, counter: state.counter + 1 })
const Decrement = state => ({ ...state, counter: state.counter - 1 })
```

but if we changed the implementation of `counter.js` to fit this particular app, it would no longer be truly self contained and reusable. Imagine, for example if we wanted a second counter in the app –– how would we define the actions then?

While the actions in `counter.js` should be strictly limited to defining operations on _counter state_, `app.js` has the knowledge of how to _extract_ current counter state from current full state and how to _merge_ next counter state to produce the next full state. Combine this knowledge with the exported `Increment` to define an action that works in this particular app:

```js
const CounterIncrement = state => ({
    ...state,
    counter: counter.Increment(state.counter),
})
```

Since we want to do the same for `Decrement` we abstract out the action-map:

```js
const counterMap = action => state => ({
    ...state,
    counter: action(state.counter),
})
const CounterIncrement = counterMap(counter.Increment)
const CounterDecrement = counterMap(counter.Decrement)
```

Here `counterMap` is an "action-map", which is to say a function that defines an action from another action. This particular action-map restricts the scope of the given action to the `counter` prop of the full state.

Defining action-maps is the first thing `hyperapp-map` can help you with, through the `makeActionMap` function. Our `counterMap` could as well have been defined like this:

```js
const counterMap = makeActionMap(
    //how to get counter state from full state:
    state => state.counter,

    // how to merge the resulting counter state with the full state:
    (state, counter) => ({ ...state, counter })
)
```

In this case there is no real benefit, since the first `counterMap` definition isn't much more complex. But what one of the actions we want to map returns an effect? What if `Increment` were defined as:

```js
//Increments the value, and two seconds later decrements it again:
const Increment = state => [state + 1, delay(Decrement, 2000)]
```

Since `app.js` shouldn't know any implementation details about `counter.js`, we can't technically assume there won't bee effects returned. Writing an action-mapper that handles effect return values, mapping the actions dispatched from those effects in the same way, is nontrivial. But `makeActionMap` we can define such actions.

But making action-maps is just half the problem. Getting mapped actions in to the view, is the other half of the problem. And this is where `mapVNode` comes in. It takes an acition-map and a virtual node, scans through the entirety of the virtual node and replaces any actions, with actions mapped with the given map.

Now `app.js` can look like this:

```js
import {makeMap, mapVNode} from 'hyperapp-map'
import * as counter from './counter.js'
import * as foo from './foo.js'

const counterMap = makeMap(x => x.counter, (x, counter) => ({...x, counter}))
const fooMap = makeMap(x => x.foo, (x, foo) => ({...x, foo}))

app({
    init: {counter: counter.init, foo: foo.init},
    view: state => h('main', {}, [
        mapVNode(counterMap, counter.view(state.counter))
        mapVNode(fooMap, foo.view(state.foo))
    ])
})

```

Using this method you may eventually find yourself at an impasse. What if you have some stateful component which is a container of somethig, like a modal dialog window that can be dragged around a window but can contain views from other actions. What if you have:

```js
...
view: state => h('main', {}, [
    mapVNode(
        modalMap,
        modal.view(state.modal, {title: "Play with the counter"}, [
            mapVNode(
                counterMap,
                counter.view(state.counter)
            )
        ])
    )
])
...
```

With this structure, all the actions in `counter.view` will be transformed as:

```
action => modalMap(counterMap(action)
```

...which will make them not work.

This is the reason `mapPass` exists. It takes an array of vnodes (or a single one) and grants each action therein a one-time shield of protection from mapping. It means they will be exempt from mapping by the next map out (only that one).

Hence, this _will_ work as exepcted:

```js
view: state =>
    h('main', {}, [
        mapVNode(
            modalMap,
            modal.view(
                state.modal,
                { title: 'Play with the counter' },
                mapPass([mapVNode(counterMap, counter.view(state.counter))])
            )
        ),
    ])
```

The action map in the counter.view is now:

```js
action => modalMap(mapPass(counterMap(action)))
```

And since `mapPass` cancels out `modalMap` in this case, all that is left is `counterMap`, which is what we wanted.

Finally, what if a module exports subscriptions? Then there is `mapSubs`, which takes a a map and an array of subscriptions. Each one will have its actions mapped by the given map. There is no equivalent to `mapPass`for subscriptions because it isn't necessary.
