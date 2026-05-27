# QuantGuide Question

## 807. Beer Barrel II

**Metadata**

- ID: `bkYaxT09LB9B2QoGQ9UF`
- URL: https://www.quantguide.io/questions/beer-barrel-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:07:24 America/New_York
- Last Edited By: Gabe

### 题干

A 120-quart beer barrel was discovered by Anna's parents. Furious, they plan to dump the barrel. Anna begs her parents to let her keep some of the beer. They say that Anna may do so if she is able to measure out an exact quart into each of a 7-quart and 5-quart vessel. You have exactly $1$ of each type of vessel. Note that Anna is allowed to pour beer from a vessel back into the beer barrel. Define a transaction as a pour of liquid from one container into another. What is the smallest number of transactions needed to accomplish the challenge? If impossible, respond with -1. 

### Hint

To achieve the task in the fewest possible transactions, follow these steps (Here are the first $4$):
$$$$
1. Fill the 7-quart measure.
$$$$
2. Fill the 5-quart measure.
$$$$
3. Empty 108 quarts from the barrel.$$$$
4. Empty the 5-quart measure into the barrel.

### 解答


To achieve the task in the fewest possible transactions (17 in total), follow these steps:
$$$$
1. Fill the 7-quart measure.
$$$$
2. Fill the 5-quart measure.
$$$$
3. Empty 108 quarts from the barrel.$$$$
4. Empty the 5-quart measure into the barrel.$$$$
5. Fill the 5-quart measure from the 7-quart measure.$$$$
6. Empty the 5-quart measure into the barrel.$$$$
7. Pour 2 quarts from the 7-quart measure into the 5-quart measure.$$$$
8. Fill the 7-quart measure from the barrel.$$$$
9. Fill up the 5-quart measure from the 7-quart measure.$$$$
10. Empty the 5-quart measure into the barrel.$$$$
11. Pour 4 quarts from the 7-quart measure into the 5-quart measure.$$$$
12. Fill the 7-quart measure from the barrel.$$$$
13. Fill up the 5-quart measure from the 7-quart measure.$$$$
14. Empty the contents of the 5-quart measure.$$$$
15. Fill the 5-quart measure from the barrel.$$$$
16. Empty 5 quarts from the 5-quart measure.$$$$
17. Empty 1 quart from the barrel into the 5-quart measure.$$$$

By following these steps, you can accomplish the task using only 17 transactions, which is the minimum number required.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bkYaxT09LB9B2QoGQ9UF",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:07:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6604569,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Beer Barrel II",
    "topic": "brainteasers",
    "urlEnding": "beer-barrel-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "bkYaxT09LB9B2QoGQ9UF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Beer Barrel II",
    "topic": "brainteasers",
    "urlEnding": "beer-barrel-ii"
  }
}
```
