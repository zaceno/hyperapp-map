# Hyperapp Map

This is a utility for [Hyperapp](https://hyperapp.dev) (v2.0.3 and above), which allows you to mark a part of your view so that any action dispatched from within it will be run through your defined pre- and post-processing. If those actions return effects which in turn dispatch actions, those actions will be subject to the same processing.

Use it to
- Write your apps in a modular fashion, where modules are reusable and agnostic about your app
- React to specific state configurations
- What else? ...You tell me!

Have a look at this [Crash-Course Example](https://codepen.io/zaceno/pen/ExxdzJZ?editors=0011) to dive right in and get an idea of what this does.


## Installation ##

### Minified IIFE from CDN in script tag ###

Add this script tag to your HTML

```html
<script src="https://unpkg.com/hyperapp-map/dist/hyperappmap.js"></script>
```

It will export `hyperappmap` in your global, which for convenience in the following
examples we will assume you have renamed to simply `map` by

```js
const map = hyperappmap
```

### Import as ES module from CDN ###

Import directly to your scripts from CDB:

```
import map from 'https://unpkg.com/hyperapp-map'
```

### Install into bundled project from npm

If you're bundling your app, you can install the package via

```
npm i hyperapp-map
```

And then import in your scripts like this:

```
import map from 'hyperapp-map'
```

## Usage ##

Basic usage is as follows:

```
map(extract, merge, target)
```

`extract` is a preprocessor of state, before handing it to an action. It is a function which is given the state an action would normally be given, and its return value is what we _actually_  give the action instead.

`merge` is a post-processeor for the result of the state. It is given `(oldState, newState)`, and what it returns is the new state we actually set. If the result from an action is a tuple of `[newState, ...effects]`, `merge` only handles the `newState` while `map` takes care of the effects, making sure any actions they dispatch are given the same treatement.

`target` can be either a function (assumed to be an action), an array (assumed to be an array of subscriptions) or else is assumed to be a vnode. 

### Mapping an action ###

```jsx
const increment = x => x + 1

const fooIncrement = map(
    state => state.foo,
    (state, foo) => ({...state, foo}),
    increment
)

app({
    init: {foo: 1, bar: 1},
    view: state => (
        <main>
            <button onclick={fooIncrement}>Up Foo</button>
        </main>
    )
    ...
})
```    

In this example, when the button is clicked, `fooIncrement` is dispatched. It was defined through `map`, to call `increment`. Instead of passing the full state to `increment`, only `state.foo`, which is `1`, is passed to increment. The result of `increment` is thus `2`, which becomes the second argument to the merge function. In the end, the state becomes `{foo: 2, bar: 1}`.

### Mapping a vnode

```jsx
const increment = x => x + 1
const decrement = x => x - 1

app({
    init: {foo: 1, bar: 1},
    view: state => (
        <main>
            {map(
                state => state.foo,
                (state, foo) => ({...state, foo}),
                <p>
                    <button onclick={decrement}>-</button>
                    {state.foo}
                    <button onclick={increment}>+</button>
                </p>
            )}
        </main>
    )
    ...
})
```

In this example, we're mapping a vnode. `map` returns a new vnode, identical to the one given with the important difference that _any_ action – both `increment` and `decrement` dispatched from within it, will be pre- & post-processed according to the given `extract` and merge function. In this case, it means that clicking the '+' and '-' buttons will increment and decrement the `foo` property of the state only, without us needing to map each action individually.

### Mapping subs ###

When map is given an array as its target, it assumes it is an array of subscriptions. It will return the same array of subscriptions, except mapped, so that any action dispatched from the subscriptions will be pre- & post-processed according to the given `extract` and `merge`

```jsx
const increment = x => x + 1
const decrement = x => x - 1

const handleKey = (state, event) =>
    event.key === 'ArrowLeft' ? decrement
  : event.key === 'ArrowRight' ? increment
  : state 

app({
    init: {foo: 1, bar: 1}
    view: state => <main>{state.foo}</main>,
    subscriptions: state => map(
        state => state.foo,
        (state, foo) => ({...state, foo}),
        [ OnKey(handleKey) ]
    )
})
```

In this example, pressing the left arrow key will cause foo to decrement, pressing the right arrow key will cause foo to increment. bar is never affected, and pressing any other key has no effect.

Important caveat: If you use the same subscriptions with the same options, but swap out the map function used during the life of your app, the new mapping will not be recognized. You will need to make sure the options are different in the subscriptions to make sure they are restarted properly with the correct & current mapping. This only applies to subscriptions.


## Examples ##


... TBC ...



