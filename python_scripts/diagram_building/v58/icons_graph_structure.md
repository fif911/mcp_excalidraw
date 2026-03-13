# Icons Graph Structure — v58

## Arrow Connections

| Icon_1 | Icon_2 | Arrow_direction | Arrow_label | Arrow_style |
|--------|--------|----------------|-------------|-------------|
| Users | Avatar UI | bidirectional | interact with | dashed |
| Avatar UI | Avatar Engine | from 1 to 2 | real time avatar generation | solid |
| Avatar Engine | Text-to-speech | bidirectional | (none) | solid |
| Avatar UI | Spoken Language Identification | from 1 to 2 | (none) | solid |
| Spoken Language Identification | Speech-to-text | from 1 to 2 | (none) | solid |
| Speech-to-text | Conversational Engine | from 1 to 2 | (none) | solid |
| Camera | Person Detection | from 1 to 2 | (none) | solid |
| Person Detection | Conversational Engine | from 1 to 2 | (none) | solid |
| Conversational Engine | Large Language Model | bidirectional | (none) | solid |
| Knowledge Vector DB | Conversational Engine | from 1 to 2 | get context | solid |
| Large Language Model | Knowledge Vector DB | from 1 to 2 | event notification | solid |
| Customer's Data Sources | Data Indexing Pipeline | from 1 to 2 | (none) | dashed |
| Data Indexing Pipeline | Knowledge Vector DB | from 1 to 2 | (none) | solid |
| Notification Pipeline | On-premise Systems | from 1 to 2 | (none) | dashed |

## Notes
- No numbered circles/badges on any arrows
- Arrow labels are italic text annotations (not numbered badges)
- "interact with" label sits on the dashed bidirectional arrow between Users and Avatar UI
- "real time avatar generation" label sits above the arrow from Avatar UI to Avatar Engine
- "get context" label sits on the vertical arrow from Knowledge Vector DB to Conversational Engine
- "event notification" label sits on the vertical arrow from LLM down to Knowledge Vector DB
