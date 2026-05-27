# QuantGuide Question

## 269. Uniform Equilibrium I

**Metadata**

- ID: `wlMi50eLHgje2thpzasC`
- URL: https://www.quantguide.io/questions/uniform-equilibrium-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/3049003/does-this-simple-continuous-game-have-nash-equilibria?rq=1
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 10:41:14 America/New_York
- Last Edited By: Gabe

### 题干

Two players, say $1$ and $2$, simultaneously pick real numbers in the interval $[0,1]$. The payoff of Player $1$ (equal to the loss of Player $2$) is the absolute distance between those numbers. Find the number of pure-strategy Nash equilbria.

### Hint

Suppose that player $1$ picks $0 < a < 1$ and player $2$ picks $0 < b < 1$. Without loss of generality, say $a < b$. Can either player do better?

### 解答

There can't be such a strategy. Suppose that player $1$ picks $0 < a < 1$ and player $2$ picks $0 < b < 1$. Without loss of generality, say $a < b$. Player $1$ could then do better by selecting $a/2$ or Player $2$ could do better by picking $\dfrac{1+b}{2}$. If they are at the endpoints, then player $2$ can do better by choosing anything that isn't $1$. Therefore, there is no such equilibria.  

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wlMi50eLHgje2thpzasC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 10:41:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2080781,
    "source": "https://math.stackexchange.com/questions/3049003/does-this-simple-continuous-game-have-nash-equilibria?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Uniform Equilibrium I",
    "topic": "probability",
    "urlEnding": "uniform-equilibrium-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "wlMi50eLHgje2thpzasC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Uniform Equilibrium I",
    "topic": "probability",
    "urlEnding": "uniform-equilibrium-i"
  }
}
```
