# QuantGuide Question

## 801. Infected Dinner II

**Metadata**

- ID: `PvsrHAsnRnGJRNVVLkYi`
- URL: https://www.quantguide.io/questions/infected-dinner-ii
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street
- Source: Jane street txt
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-15 00:04:48 America/New_York
- Last Edited By: Gabe

### 题干

There are $1000$ people having dinner at a grand hall. One of them is known to be sick, while the other $999$ are healthy. Each minute, each person talks to one other person in the room at random. However, as everyone is social, nobody talks to people they have previously talked to. In each pair, if one is sick and one is healthy, the healthy person is infected and becomes sick. Once a person becomes sick, they are assumed to be sick for the rest of the dinner. Find the maximum amount of time (in minutes) until every person in the hall becomes sick.

### Hint

Consider grouping the $1000$ people into $25$ groups of $40$ people. In $25$ rounds of $39$ minutes each, every person in a given bubble talks to every other person in that bubble. Additionally, each of the other bubbles are paired up. Suppose the original sick person is in Bubble $25$ and the last healthy person is in Bubble $24$. In round $k$, we can have all the people in bubble $b$ talk to all of the people in bubble $24 - b + k \hspace{3pt} \text{mod} \hspace{3pt} 25$, where $0$ maps to $25$. What happens with this?

### 解答

Consider grouping the $1000$ people into $25$ groups of $40$ people. In $25$ rounds of $39$ minutes each, every person in a given bubble talks to every other person in that bubble. Additionally, each of the other bubbles are paired up.

$$$$

Suppose the original sick person is in Bubble $25$ and the last healthy person is in Bubble $24$. In round $k$, we can have all the people in bubble $b$ talk to all of the people in bubble $24 - b + k \hspace{3pt} \text{mod} \hspace{3pt} 25$, where $0$ maps to $25$. Therefore, we see that after $k$ rounds, the sick people belong to people in Bubble $25$ and Bubbles $1,2,\dots, k-1$. This is since at round $1$, Bubble $25$ talks with itself. Afterwards, it talks with Bubbles $1,2,\dots, k-1$. Therefore, Bubble $24$ will be completely untouched until after the first $24$ rounds, which is $936$ minutes. Then, in the $937$th minute, everyone in the $24$th bubble talks to everyone in the $25$th bubble, meaning all are infected in the first minute. Therefore, after $937$ minutes, everyone is infected.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "937"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "PvsrHAsnRnGJRNVVLkYi",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 00:04:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6557150,
    "source": "Jane street txt",
    "status": "published",
    "tags": [],
    "title": "Infected Dinner II",
    "topic": "brainteasers",
    "urlEnding": "infected-dinner-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "PvsrHAsnRnGJRNVVLkYi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Infected Dinner II",
    "topic": "brainteasers",
    "urlEnding": "infected-dinner-ii"
  }
}
```
