# QuantGuide Question

## 509. Incomplete Deck

**Metadata**

- ID: `EON8MsE7aB5zyUve6R8G`
- URL: https://www.quantguide.io/questions/incomplete-deck
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Maven Securities
- Source: Kaushik - Maven Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 13:54:35 America/New_York
- Last Edited By: Gabe

### 题干

A standard deck of cards ($52$ cards total) has a few cards removed from it. If you divide the the number of cards in the deck by $3$, you get a remainder of $1$. If you divide the deck by $5$, you get a remainder of $3$. Finally, if you divide the deck by $4$, you get a remainder of $3$. How many cards are in the deck?

### Hint

Let $n$ be the number of cards in the deck. Let $a$, $b$, and $c$ be some integers such that these equations hold true:
$$
n-1=3a
$$$$
n-3=5b
$$$$
n-3 = 4c
$$

Try to make the first equation $n-3$ as well and relate it to the rest.

### 解答

Let $n$ be the number of cards in the deck. Let $a$, $b$, and $c$ be some integers such that these equations hold true:
$$
n-1=3a
$$$$
n-3=5b
$$$$
n-3 = 4c
$$
We can rearrange the first equation to become:
$$
n-3=3a-2
$$
These three equations means that 
$$
n-3 = \text{LCM}(3a-2, 4, 5)
$$
or
$$
n-3 = \text{LCM}(3a-2, 20)
$$
We know that the multiples of $20$ are $20$, $40$, $60$, etc but since we know we have less cards than a standard deck, we should only care about $20$ and $40$. Out of these two, $40$ is the number that is also divisible by $3a-2$ when $a$ is $14$. Since $$
\text{LCM}(3a-2, 4, 5)=40$$we get $n-3=40$ which means $n=43$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "43"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "EON8MsE7aB5zyUve6R8G",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 13:54:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4062774,
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Incomplete Deck",
    "topic": "brainteasers",
    "urlEnding": "incomplete-deck",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "easy",
    "id": "EON8MsE7aB5zyUve6R8G",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Incomplete Deck",
    "topic": "brainteasers",
    "urlEnding": "incomplete-deck"
  }
}
```
