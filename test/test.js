import 'undom/register'
import test from 'ava'
import { h, app } from 'hyperapp'
import { makeMap, mapVNode, mapSubs, mapPass } from '../src/index.js'
/*
In a DOM node, find the first one with given id and return it
or null, if it doesn't exist
*/
const getById = (node, id) => {
    if (node.getAttribute && node.getAttribute('id') === id) return node
    if (node.childNodes && node.childNodes.length) {
        let matches = node.childNodes
            .map(child => getById(child, id))
            .filter(child => !!child)
        if (matches.length > 0) return matches[0]
    }
    return null
}

/*
    takes a definition of init, view and subscriptions.
    rerturns {
        state: call to get current state
        dispatch: dispatch any action, with or without payload,
        event (targetId, eventName): on the target with given id, dispatch event of given type
    }
*/
const testApp = def => {
    let parent = document.createElement('div')
    let node = document.createElement('main')
    parent.appendChild(node)
    let _state
    let _dispatch = () => null
    const middleware = d =>
        (_dispatch = (state, ...rest) => {
            if (
                Array.isArray(state) &&
                typeof state[0] !== 'function' &&
                !Array.isArray(state[0])
            ) {
                _state = state[0]
            } else if (typeof state !== 'function') {
                _state = state
            }
            return d(state, ...rest)
        })
    app({ ...def, node, middleware })
    return {
        dispatch: (...args) => _dispatch(...args),
        state: () => _state,
        event: (id, name) => {
            let target = getById(parent, id)
            if (!target) console.log('WARN: no target found', id)
            target && target.dispatchEvent(new Event(name))
        },
    }
}

/*
    Calls map with predefined extractor and merger for slice "foo"
*/
const sliceMap = makeMap(
    s => s.foo,
    (s, y) => ({ ...s, foo: y })
)

test('dispatch mapped action', t => {
    const { state, dispatch } = testApp({ init: { foo: 2, bar: 5 } })
    dispatch(sliceMap(x => x + 1))
    t.deepEqual(state(), { foo: 3, bar: 5 })
})

test('dispatch mapped action with external payload', t => {
    const { state, dispatch } = testApp({ init: { foo: 2, bar: 5 } })
    dispatch(
        sliceMap((x, y) => x + y),
        2
    )
    t.deepEqual(state(), { foo: 4, bar: 5 })
})

test('dispatch mapped action with effects', t => {
    let effectCalled = false
    const myEffect = (f => v => [f, { v }])((_, { v }) => {
        effectCalled = v
    })
    const { state, dispatch } = testApp({ init: { foo: 2, bar: 5 } })
    dispatch(sliceMap(x => [x + 3, myEffect(3)]))
    t.deepEqual(state(), { foo: 5, bar: 5 })
    t.is(effectCalled, 3)
})

test('dispatch mapped action with effects with actions', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state, dispatch } = testApp({ init: { foo: 4, bar: 5 } })
    dispatch(sliceMap(addNMulN), 3)
    t.deepEqual(state(), { foo: 21, bar: 5 })
})

test('dispatch mapped action with effects with actions with payloads', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec([mul, y])]
    const { state, dispatch } = testApp({ init: { foo: 4, bar: 5 } })
    dispatch(sliceMap(addNMulN), 3)
    t.deepEqual(state(), { foo: 21, bar: 5 })
})

//---

test('dispatch twice-mapped action', t => {
    const { state, dispatch } = testApp({
        init: { foo: { foo: 2, baz: 1 }, bar: 5 },
    })
    dispatch(sliceMap(sliceMap(x => x + 1)))
    t.deepEqual(state(), { foo: { foo: 3, baz: 1 }, bar: 5 })
})

test('dispatch twice-mapped action with external payload', t => {
    const { state, dispatch } = testApp({
        init: { foo: { foo: 2, baz: 1 }, bar: 5 },
    })
    dispatch(sliceMap(sliceMap((x, y) => x + y)), 2)
    t.deepEqual(state(), { foo: { foo: 4, baz: 1 }, bar: 5 })
})

test('dispatch twice-mapped action with effects', t => {
    let effectCalled = false
    const myEffect = (f => v => [f, { v }])((_, { v }) => {
        effectCalled = v
    })
    const { state, dispatch } = testApp({
        init: { foo: { foo: 2, baz: 1 }, bar: 5 },
    })
    const add3 = x => x + 3
    const action = x => [add3(x), myEffect(3)]
    dispatch(sliceMap(sliceMap(action)))
    t.deepEqual(state(), { foo: { foo: 5, baz: 1 }, bar: 5 })
    t.is(effectCalled, 3)
})

test('dispatch twice-mapped action with effects with actions', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state, dispatch } = testApp({
        init: { foo: { foo: 4, baz: 1 }, bar: 5 },
    })
    dispatch(sliceMap(sliceMap(addNMulN)), 3)
    t.deepEqual(state(), { foo: { foo: 21, baz: 1 }, bar: 5 })
})

test('dispatch twice-mapped action with effects with actions with payloads', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec([mul, y])]
    const { state, dispatch } = testApp({
        init: { foo: { foo: 4, baz: 1 }, bar: 5 },
    })
    dispatch(sliceMap(sliceMap(addNMulN)), 3)
    t.deepEqual(state(), { foo: { foo: 21, baz: 1 }, bar: 5 })
})

// ---------

test('subscribe to mapped action', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state => mapSubs(sliceMap, [sub(mul)]),
    })
    trigger(4)
    t.deepEqual(state(), { foo: 12, bar: 1 })
})

test('does not restart subscription for mapped sub', t => {
    const noop = () => {}
    let trigger = noop
    let started = 0
    const sub = (f => a => [f, { a }])((d, { a }) => {
        started++
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state => mapSubs(sliceMap, [sub(mul)]),
    })
    trigger(4)
    trigger(4)
    t.is(started, 1)
    t.deepEqual(state(), { foo: 48, bar: 1 })
})

test('subscribe to mapped action with payload', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state => mapSubs(sliceMap, [sub([mul, x => x + 2])]),
    })
    trigger(4)
    t.deepEqual(state(), { foo: 18, bar: 1 })
})

test('subscribe to mapped action that returns other action', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const op = (x, z) => [mul, z]
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state => mapSubs(sliceMap, [sub([op, x => x + 2])]),
    })
    trigger(4)
    t.deepEqual(state(), { foo: 18, bar: 1 })
})

test('mapped subs with actions with effects with actions', t => {
    const noop = () => {}
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, [sub([addNMulN, x => x + 1])]),
    })
    trigger(2)
    t.deepEqual(state(), { foo: 18, bar: 1 })
})

test('mapped subs with actions with effects with actions with payloads', t => {
    const noop = () => {}
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const addNMulN = (x, y) => [add(x, y), exec([mul, y])]
    const { state } = testApp({
        init: { foo: 3, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, [sub([addNMulN, x => x + 1])]),
    })
    trigger(2)
    t.deepEqual(state(), { foo: 18, bar: 1 })
})

//-------

test('subscribe to twice mapped action', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const { state } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, mapSubs(sliceMap, [sub(mul)])),
    })
    trigger(4)
    t.deepEqual(state(), { foo: { foo: 12, baz: 2 }, bar: 1 })
})

test('subscribe to twice mapped action with payload', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const { state } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, mapSubs(sliceMap, [sub([mul, x => x + 2])])),
    })
    trigger(4)
    t.deepEqual(state(), { foo: { foo: 18, baz: 2 }, bar: 1 })
})

test('subscribe to twice mapped action that returns other action', t => {
    const noop = () => {}
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const mul = (x, y) => x * y
    const op = (x, z) => [mul, z]
    const { state } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, mapSubs(sliceMap, [sub([op, x => x + 2])])),
    })
    trigger(4)
    t.deepEqual(state(), { foo: { foo: 18, baz: 2 }, bar: 1 })
})

test('twice mapped subs with actions with effects with actions', t => {
    const noop = () => {}
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, mapSubs(sliceMap, [sub([addNMulN, x => x + 1])])),
    })
    trigger(2)
    t.deepEqual(state(), { foo: { foo: 18, baz: 2 }, bar: 1 })
})

test('twice mapped subs with actions with effects with actions with payloads', t => {
    const noop = () => {}
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    let trigger = noop
    const sub = (f => a => [f, { a }])((d, { a }) => {
        trigger = x => d(a, x)
        return () => {
            trigger = noop
        }
    })
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const addNMulN = (x, y) => [add(x, y), exec([mul, y])]
    const { state } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        subscriptions: state =>
            mapSubs(sliceMap, mapSubs(sliceMap, [sub([addNMulN, x => x + 1])])),
    })
    trigger(2)
    t.deepEqual(state(), { foo: { foo: 18, baz: 2 }, bar: 1 })
})

test.cb('mapped view with action', t => {
    const add = (x, y) => x + y
    const { state, event } = testApp({
        init: { foo: 3, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('button', { id: 'button', onclick: [add, 1] }, '+')
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 4, bar: 1 })
        t.end()
    }, 0)
})

test.cb('mapped view with action that returns action', t => {
    const add = (x, y) => x + y
    const op = (x, y) => [add, y]
    const { state, event } = testApp({
        init: { foo: 3, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('button', { id: 'button', onclick: [op, 1] }, '+')
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 4, bar: 1 })
        t.end()
    }, 0)
})

test.cb('mapped view with actions with effects with actions', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state, event } = testApp({
        init: { foo: 3, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('button', { id: 'button', onclick: [addNMulN, 4] }, '+')
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 28, bar: 1 })
        t.end()
    }, 0)
})

test.cb(
    'mapped view with actions with effects with actions with payloads',
    t => {
        const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
        const mul = (x, y) => x * y
        const add = (x, y) => x + y
        const addNMulN = (x, y) => [add(x, y), exec([mul, x => x - 1], y)]
        const { state, event } = testApp({
            init: { foo: 3, bar: 1 },
            view: state =>
                mapVNode(
                    sliceMap,
                    h('button', { id: 'button', onclick: [addNMulN, 4] }, '+')
                ),
        })
        setTimeout(_ => {
            event('button', 'click')
            t.deepEqual(state(), { foo: 21, bar: 1 })
            t.end()
        }, 0)
    }
)

// ---------

test.cb('nested mapped view with action', t => {
    const add = (x, y) => x + y
    const { state, event } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('div', {}, [
                    h('div', {}, [
                        mapVNode(
                            sliceMap,
                            h(
                                'button',
                                { id: 'button', onclick: [add, 1] },
                                '+'
                            )
                        ),
                    ]),
                ])
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: { foo: 4, baz: 2 }, bar: 1 })
        t.end()
    }, 0)
})

test.cb('nested mapped view with action that returns action', t => {
    const add = (x, y) => x + y
    const op = (x, y) => [add, y]
    const { state, event } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('div', {}, [
                    h('div', {}, [
                        mapVNode(
                            sliceMap,
                            h(
                                'button',
                                { id: 'button', onclick: [add, 1] },
                                '+'
                            )
                        ),
                    ]),
                ])
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: { foo: 4, baz: 2 }, bar: 1 })
        t.end()
    }, 0)
})

test.cb('nested mapped view with actions with effects with actions', t => {
    const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
    const mul = (x, y) => x * y
    const add = (x, y) => x + y
    const addNMulN = (x, y) => [add(x, y), exec(mul, y)]
    const { state, event } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        view: state =>
            mapVNode(
                sliceMap,
                h('div', {}, [
                    h('div', {}, [
                        mapVNode(
                            sliceMap,
                            h(
                                'button',
                                { id: 'button', onclick: [addNMulN, 4] },
                                '+'
                            )
                        ),
                    ]),
                ])
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: { foo: 28, baz: 2 }, bar: 1 })
        t.end()
    }, 0)
})

test.cb(
    'nested mapped view with actions with effects with actions with payloads',
    t => {
        const exec = (f => (a, p) => [f, { a, p }])((d, { a, p }) => d(a, p))
        const mul = (x, y) => x * y
        const add = (x, y) => x + y
        const addNMulN = (x, y) => [add(x, y), exec([mul, x => x - 1], y)]
        const { state, event } = testApp({
            init: { foo: { foo: 3, baz: 2 }, bar: 1 },
            view: state =>
                mapVNode(
                    sliceMap,
                    h('div', {}, [
                        h('div', {}, [
                            mapVNode(
                                sliceMap,
                                h(
                                    'button',
                                    { id: 'button', onclick: [addNMulN, 4] },
                                    '+'
                                )
                            ),
                        ]),
                    ])
                ),
        })
        setTimeout(_ => {
            event('button', 'click')
            t.deepEqual(state(), { foo: { foo: 21, baz: 2 }, bar: 1 })
            t.end()
        }, 0)
    }
)

test.cb('immediately nested views should also work', t => {
    const add = (x, y) => x + y
    const { state, event } = testApp({
        init: { foo: { foo: 3, baz: 2 }, bar: 1 },
        view: state =>
            h('div', {}, [
                h('div', {}, [
                    mapVNode(
                        sliceMap,
                        mapVNode(
                            sliceMap,
                            h(
                                'button',
                                { id: 'button', onclick: [add, 1] },
                                '+'
                            )
                        )
                    ),
                ]),
            ]),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: { foo: 4, baz: 2 }, bar: 1 })
        t.end()
    }, 0)
})

test.cb('changing map of vnode should work', t => {
    const barMap = makeMap(
        s => s.bar,
        (s, y) => ({ ...s, bar: y })
    )
    const add = (x, y) => x + y
    const { state, event } = testApp({
        init: { foo: 3, bar: 1 },
        view: state =>
            mapVNode(
                state.foo > 3 ? barMap : sliceMap,
                h('button', { id: 'button', onclick: [add, 1] }, '+')
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        setTimeout(_ => {
            event('button', 'click')
            t.deepEqual(state(), { foo: 4, bar: 2 })
            t.end()
        }, 0)
    }, 0)
})

test.cb('merge can return unmapped effect tuple', t => {
    const myMap = makeMap(
        state => state,
        (oldState, newState) => (newState.foo > 1 ? upBar(newState) : newState)
    )
    const exec = (f => a => [f, { a }])((d, { a }) => d(a))
    const upFoo = state => ({ ...state, foo: state.foo + 1 })
    const upBar = state => [{ ...state, bar: state.bar + 1 }, exec(upBaz)]
    const upBaz = state => ({ ...state, baz: state.baz + 1 })
    const { state, event } = testApp({
        init: { foo: 1, bar: 1, baz: 1 },
        view: state =>
            mapVNode(myMap, h('button', { id: 'button', onclick: upFoo }, '+')),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 2, bar: 2, baz: 2 })
        t.end()
    }, 0)
})

test.cb('mapPass protects from outer map', t => {
    const fooMap = makeMap(
        x => x.foo,
        (x, foo) => ({ ...x, foo })
    )
    const change = state => 'changed'
    const { state, event } = testApp({
        init: { foo: 'original' },
        view: state =>
            h('div', {}, [
                mapVNode(
                    fooMap,
                    h(
                        'div',
                        {},
                        mapPass([
                            h('button', { id: 'button', onclick: change }),
                        ])
                    )
                ),
            ]),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), 'changed')
        t.end()
    }, 0)
})
test.cb('mapPassthrouhg does not prevent inner map', t => {
    const fooMap = makeMap(
        x => x.foo,
        (x, foo) => ({ ...x, foo })
    )
    const barMap = makeMap(
        x => x.bar,
        (x, bar) => ({ ...x, bar })
    )
    const change = state => 'changed'
    const { state, event } = testApp({
        init: { foo: 'original', bar: 'original' },
        view: state =>
            mapVNode(
                fooMap,
                h(
                    'div',
                    {},
                    mapPass([
                        h('div', {}, [
                            mapVNode(
                                barMap,
                                h('button', { id: 'button', onclick: change })
                            ),
                        ]),
                    ])
                )
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 'original', bar: 'changed' })
        t.end()
    }, 0)
})

test.cb('mapPass does not prevent second outer map', t => {
    const fooMap = makeMap(
        x => x.foo,
        (x, foo) => ({ ...x, foo })
    )
    const barMap = makeMap(
        x => x.bar,
        (x, bar) => ({ ...x, bar })
    )
    const change = state => 'changed'
    const { state, event } = testApp({
        init: { foo: 'original', bar: 'original' },
        view: state =>
            mapVNode(
                fooMap,
                h('div', {}, [
                    mapVNode(
                        barMap,
                        h(
                            'div',
                            {},
                            mapPass([
                                h('button', { id: 'button', onclick: change }),
                            ])
                        )
                    ),
                ])
            ),
    })
    setTimeout(_ => {
        event('button', 'click')
        t.deepEqual(state(), { foo: 'changed', bar: 'original' })
        t.end()
    }, 0)
})
