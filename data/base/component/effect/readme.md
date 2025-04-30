# Effects

status effect can trigger other effects over time. This also means it could trigger another status effect, which could also trigger some sort of infinite loop. So it may need to be explicitly handled or separated form effects.

Try to support some custom handling where we can dynamically pick up all schemas in a folder
"oneOf": "../component/effect/\*.schema.json"
