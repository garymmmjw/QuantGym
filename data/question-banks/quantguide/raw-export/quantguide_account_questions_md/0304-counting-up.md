# QuantGuide Question

## 304. Counting Up

**Metadata**

- ID: `yz5DZTugUbVxb41vEabk`
- URL: https://www.quantguide.io/questions/counting-up
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:20:04 America/New_York
- Last Edited By: Gabe

### 题干

Jay and Kay play a game where Jay calls out a number between $1$ and $8$ to start. Afterwards, Kay gets to pick a number that is between $1$ and $8$ larger than the number Jay keeps. They repeatedly select in this fashion. The first player to call out the number $200$ wins. There is a value that Jay can choose to start with so that if he plays optimally, he will always win. What is this value? If this is not possible, answer "-1".

### Hint

Note that $200 = 9 \cdot 22 + 2$. How can you use modular arithmetic to find Jay's optimal starting value?

### 解答

When Jay guesses 2, Kay can only pick the values $3$ to $10$. Regardless of what Kay says, Jay should then select $11$. In this pattern, Jay will select all values in the form $9k + 2$ for $k$ an integer. The largest value in this form less than $200$ is $191$. Once Jay says $191$, Kay must pick a value $192$ to $199$. Regardless of what Kay says, the value will be within $8$ of $200$, so Jay can say $200$ on the next turn. The reason to think of this is because $200$ is also in the form $9k+2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "yz5DZTugUbVxb41vEabk",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:20:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2372843,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Counting Up",
    "topic": "brainteasers",
    "urlEnding": "counting-up",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "yz5DZTugUbVxb41vEabk",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Counting Up",
    "topic": "brainteasers",
    "urlEnding": "counting-up"
  }
}
```
