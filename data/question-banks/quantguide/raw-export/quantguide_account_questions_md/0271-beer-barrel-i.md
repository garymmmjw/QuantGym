# QuantGuide Question

## 271. Beer Barrel I

**Metadata**

- ID: `OOKh8U1G2yHdEZG22e4A`
- URL: https://www.quantguide.io/questions/beer-barrel-i
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: http://jnsilva.ludicum.org/HMR13_14/536.pdf
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 20:07:18 America/New_York
- Last Edited By: Gabe

### 题干

A 120-quart beer barrel was discovered by Anna's parents. Furious, they plan to dump the barrel. Anna begs her parents to let her keep some of the beer. They say that Anna may do so if she is able to measure out an exact quart into each of a 7-quart and 5-quart vessel. Define a transaction as a pour of liquid from one container into another. What is the smallest number of transactions needed to accomplish the challenge? If impossible, respond with -1. 

### Hint

We can solve this problem by following these steps in order (These are are the first $4$ steps): 

$$$$
1. Perform 14 transactions of filling and emptying the 7-quart measure, wasting 98 quarts and leaving 22 quarts in the barrel.
$$$$
2. Fill the 7-quart measure, then transfer 5 quarts to the 5-quart measure, leaving 2 quarts in the 7-quart.
$$$$
3. Empty the 5-quart measure, then transfer 2 quarts from the 7-quart to the 5-quart.
$$$$
4. Fill the 7-quart measure, then fill up the 5-quart from the 7-quart, leaving 4 quarts in the 7-quart.

### 解答

We can solve this problem by following these steps in order: 
$$$$
1. Perform 14 transactions of filling and emptying the 7-quart measure, wasting 98 quarts and leaving 22 quarts in the barrel.
$$$$
2. Fill the 7-quart measure, then transfer 5 quarts to the 5-quart measure, leaving 2 quarts in the 7-quart.
$$$$
3. Empty the 5-quart measure, then transfer 2 quarts from the 7-quart to the 5-quart.
$$$$
4. Fill the 7-quart measure, then fill up the 5-quart from the 7-quart, leaving 4 quarts in the 7-quart.
$$$$
5. Empty the 5-quart measure, then transfer 4 quarts from the 7-quart to the 5-quart.
$$$$
6. Fill the 7-quart measure again, then fill up the 5-quart from the 7-quart, leaving 6 quarts in the 7-quart.
$$$$
7. Empty the 5-quart measure, then fill the 5-quart from the 7-quart, leaving 1 quart in the 7-quart.
$$$$
8. Empty the 5-quart measure, leaving 1 quart in the 7-quart.
$$$$
9. Draw off the remaining 1 quart from the barrel into the 5-quart measure, completing the task in 14 more transactions, totaling 42 transactions with the initial 28.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "42"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "OOKh8U1G2yHdEZG22e4A",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:07:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2101698,
    "source": "http://jnsilva.ludicum.org/HMR13_14/536.pdf",
    "status": "published",
    "tags": [],
    "title": "Beer Barrel I",
    "topic": "brainteasers",
    "urlEnding": "beer-barrel-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "OOKh8U1G2yHdEZG22e4A",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Beer Barrel I",
    "topic": "brainteasers",
    "urlEnding": "beer-barrel-i"
  }
}
```
