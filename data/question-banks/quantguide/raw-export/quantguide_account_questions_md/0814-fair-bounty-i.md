# QuantGuide Question

## 814. Fair Bounty I

**Metadata**

- ID: `3i3x9wFePzo12bQgIMyd`
- URL: https://www.quantguide.io/questions/fair-bounty-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel
- Source: Citadel OA
- Tags: Discrete Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-27 11:23:58 America/New_York
- Last Edited By: Gabe

### 题干

You're on a game show! The host tells you that $\$200$ is located behind one of $7$ doors. The other $6$ doors have nothing behind them. You have no idea which door the money is behind. You keep selecting randomly until you find the money. You do not select any doors that you have selected prior. If each door opening costs $\$x$ and the game is fair, what is $x$?

### Hint

As the money is behind a random door, the number of selections needed to find the money is discrete uniform on $\{1,2,\dots,7\}$.

### 解答

As the money is behind a random door, the number of selections needed to find the money is discrete uniform on $\{1,2,\dots,7\}$. Note that it is not geometric since the success probability changes each time. The expected number of selections needed to find the money is therefore $4$. For the game to be fair, this means each draw must cost $x = \dfrac{200}{4} = 50$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3i3x9wFePzo12bQgIMyd",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-27 11:23:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6677570,
    "randomizable": "",
    "source": "Citadel OA",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Fair Bounty I",
    "topic": "probability",
    "urlEnding": "fair-bounty-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "3i3x9wFePzo12bQgIMyd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Fair Bounty I",
    "topic": "probability",
    "urlEnding": "fair-bounty-i"
  }
}
```
