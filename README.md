# Hyperapp Map

This is a utility for [Hyperapp](https://hyperapp.dev) (v2.0.3 and above), which essentially allows you to mark a part your view so that any action dispatched from that part of your view will be run through your defined pre- and post-processing. If those actions return effects which in turn dispatch actions, they _too_ will be subject to the same processing.

The primary use case for this is to allow you write your app in a modular
fashion, where each module can group related actions together in a way that
is reusable and agnostic of the rest of the app.

Other uses include monitoring and reacting to changes in various parts of
your state, from a central point in your app.
