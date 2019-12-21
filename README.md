# Hyperapp Map

This is a utility for [Hyperapp](https://hyperapp.dev) (v2.0.3 and above). It helps you structure your app as a composition  of self-contained, reusable modules, while staying true to the single-state, one-way-data-flow paradigm.

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

## Action Maps

An action map is a transformation of an action into another action. It is a function which takes an action as its single argument, and returns a new action. Typically, it is used to: 

- Make an action which performs the same transform as an original action on a particular portion of the state.
- Make an action which extends/alters the transform of an original action

For instance, we might have actions:

```js
const Increment = state => state + 1
const Decrement = state => state - 1
```

but if the state is shaped as: `{foo: 'bar', counter: 7}`, those actions in and of themselves are useless. Instead of explicitly redefining every action to understand the shape of the state, we can define an action map `counterMap` that lets us reuse our simple, primitive actions:

```js
const CounterIncrement = counterMap(Increment)
const CounterDecrement = counterMap(Decrement)
```

Assuming `counterMap` works correctly, then `CounterIncrement({foo: 'bar', counter:7})` will return `{foo: 'bar', counter: 8}` 

### `makeMap(extractFn, mergeFn) -> actionMap` ###

`makeMap` allows you to define actionMaps, by passing it two functions. The first is the "extractor": given the full state, it should return the state we want to pass to the action being transformed. The second is the "merger", which is itself shaped like an action which receives the result of calling the transformed action with the extracted state, as the payload.

Our `counterMap` above could be defined as:

```js
const counterMap = makeMap(
    state => state.counter,
    (state, counter) => ({...state, counter})
)
```

### Mapping actions with effects ###

"Big deal!", I hear you say. "I could just as easily define `counterMap` like this, without a library":

```js
const counterMap = action =>
    (state, payload) =>
        ({
            ...state,
            counter: action(state.counter, payload)
        })
```

Yes, you could. But what if the action you want to transform returns effects? What if `Increment` were implemented as:

```js
//increment and after two seconds decrement again:
const Increment = state => [state + 1, delay(Decrement, 2000)]
const Decrement = state => state - 1
```

Action maps defined with `makeMap` will handle this. Effects returned by transformed actions, will be returned from the transformed action. Additionally, any actions dispatched from those effects will be mapped using the same action map (since this is usually what you want, as in the case above).

The merger, being shaped like an action, can also return effects but these will be unmapped (also probably what you want).

Making your own action maps that can handle effects takes a lot more code than the simple example earlier, and that is why `makeMap` exists.

### Weaving logic together ###

If you define your actions as primitive and straightforward as `Increment = state => state + 1`, then you are free to use them in multiple places in multiple apps. But you'll need to use an action map to add the specific logic required for each use.

Let's say you have some kind of game where you can "pay coins" from a "purse". You can pay even though your purse is empty, but in that case you will have to loan the coin from a bank instead. Paying means using `Decrement` on your purse, but we need to add the lending logic on top of that. You can do this with an action map.

```js
const purseMap = makeMap(
    state => state.purse,
    (state, purse) => ({
        ...state,
        debt: purse >= 0 ? state.debt : state.debt - purse,
        purse: purse >= 0 ? purse : 0
    })
)

const PayOne = purseMap(Decrement)
```

## Mapping VNodes

So far we've covered defining action maps, and using them to define actions specific to our app, from generic, primitive actions. This can get quite tedius in a large app.

You can save yourself a lot of boilerplate, by letting your view's event handlers refer to primitive actions, and then mapping all the actions referred in a section of the view with an appropriate action map. That is what `mapVNode` does. It walks through a vnode recursively, applying a given map to all the actions defined for the event handlers within.

### `mapVNode(actionMap, vnode) -> vnode`

Let's say you've defined a `counter.js` module:

```js
import {h} from 'hyperapp'

const init = 0

const Increment = state => state + 1

const Decrement = state => state - 1

const view = state =>
    h('p', {}, [
        h('button', { onclick: Decrement }, '-'),
        state,
        h('button', { onclick: Increment }, '+'),
    ])

export {init, view}
```

In your main app, you can now render the working counter view in your main view, without ever explicitly needing to deal with any of its actions:

```js
import {h, app} from 'hyperapp'
import {makeMap, mapVNode} from 'hyperapp-map'
import * as counter from './counter.js'
import * as foo from './foo.js'

const counterMap = makeMap(
    state => state.counter,
    (state, counter) => ({...state, counter})
)

const fooMap = makeMap(
    state => state.foo,
    (state, foo) => ({...state, foo})
)

app({
    init: {
        foo: foo.init,
        counter: counter.init,
    },
    view: state => h('main', {}, [
        mapVNode(counterMap, counter.view(state.counter)),
        mapVNode(fooMap, foo.view(state.foo)),
    ])
})
```

You can even integrate the logic of the counter with the logic of foo, simply by changing the implementation of `counterMap`:

```js

const counterMap = makeMap(
    state => state.counter,
    (state, counter) => ({
        ...state,
        counter: Math.min(foo.getMax(state.foo), counter)
    })
)
```

(Here, we assumed the `foo` module can provide an upper limit we want to apply to the counter, through the method `getMax`)

For convenience `mapVNode` can take an array of vnodes instead of just a single vnode, and will apply the map to all the vnodes in the array.


## Unmapped Content

When you've defined a stateful component that is able to "contain" some generic content – for example a fancy, stateful pop-up window, a transition-group, et c – then you typically don't want the content to be mapped. 

### `mapPass([vnode1, vnode2, ...])-> [vnode1, vnode2, ...]`

`mapPass` simply takes an array of vnodes, and for each vnode it grants a one-time "shield of protection" against applications of `mapVNode`. Use it to protect generic content from being mapped by the map that should apply to actions in the container.

For example:

```js
mapVNode(popupMap, popup.view(
    state.popup,
    {title: 'Edit Profile'},
    mapPass([
        mapVNode(profileMap, profile.form(
            state.profile
        ))
    ])
))
```

In this example, any action `x` in `profile.form` will _not_ become `popupMap(formMap(x))` – that would have broken the application, probably! Thanks to `mapPass` protecting `profile.form` from being mapped by `popupMap`, `x` will simply be `profileMap(x)` which is likely what we need.

## Mapping Subscriptions

Thanks to `mapVNode` we can map actions in bulk without explicitly referring to them, or modules needing to export them, even. But there is one more source of action-dispatching we need to consider, before we are completely covered: subscriptions.

### `mapSubs(actionMap, [sub1, sub2, ...]) -> [sub1, sub2, ....]`

`mapSubs` will take an array of subscriptions, and return the same array with any actions referred to in any of the subscriptions' options having been mapped by the given action map.

For example, you might want your counter module to listen to global keyboard events for incrementing and decrementing:


```js
...

const HandleKey = (state, key) => (
     key === 'ArrowUp'   ? Increment
   : key === 'ArrowDown' ? Decrement
   : state
)

const subscriptions= state => [ OnKeyDown([HandleKey, eventKey]) ]

export {init, view, subscriptions}
```

In the main module, use it as such:

```js
app({
    ...
    subscriptions: state => [
        ...mapSubs(counterMap, counter.subscriptions(state.counter))
    ]
})
```

Normally, inlining a transforming function like that in the subscriptions is dangerous, since it means that the subscriptions properties will be different each state-update, which will cause the subscriptions to restart continually. This case is safe, however, since `counterMap` is defined using `makeMap`. Action maps defined with `makeMap` are memoized so that repeated mappings of the same action will yield the same mapped action instance every time.

## Examples 

... tbc ...
