# QuantGuide Question

## 833. Fair Bounty II

**Metadata**

- ID: `6qbQy0jSDuluUSKZxGTe`
- URL: https://www.quantguide.io/questions/fair-bounty-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: Original, modified Cit OA
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-27 11:27:47 America/New_York
- Last Edited By: Gabe

### 题干

You're on a game show! The host tells you that $\$200$ is located behind $2$ of $7$ doors. The other $5$ doors have nothing behind them. You have no idea which doors the money is behind. You keep selecting randomly until you find the first door with money behind it. You do not select any doors that you have selected prior. If each door opening costs $\$x$ and the game is fair, what is $x$?

### Hint

Use a "First Ace" approach, where the aces here are the doors with the money.

### 解答

Thinking of the two doors with money as aces, we want to find the expected number of doors that need to be opened, say $b$, until we find the first door with money. Our answer would then be $\dfrac{200}{b}$, as the expected cost to find the first door with money is $b \cdot \dfrac{200}{b} = 200$. 

$$$$

With the doors having money fixed, there are $5$ other empty doors. The two doors with money divide up our total selection into 3 equally-sized regions in expectation. Therefore, there are, on average, $\dfrac{5}{3}$ doors before the first door with money. We must add one in for the selection of the door with actual money. We get $b = \dfrac{8}{3}$, so $$x = 200 \cdot \dfrac{3}{8} = 75$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "75"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6qbQy0jSDuluUSKZxGTe",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-27 11:27:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6858811,
    "source": "Original, modified Cit OA",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Fair Bounty II",
    "topic": "probability",
    "urlEnding": "fair-bounty-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "6qbQy0jSDuluUSKZxGTe",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Fair Bounty II",
    "topic": "probability",
    "urlEnding": "fair-bounty-ii"
  }
}
```
