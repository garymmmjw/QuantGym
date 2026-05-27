# QuantGuide Question

## 413. Repetitious Game I

**Metadata**

- ID: `vFUmOpYhIFeXQ0aHw3XK`
- URL: https://www.quantguide.io/questions/repetitious-game-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Common question
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Audrey is playing a game. She flips a fair coin repeatedly until she gets two heads in a row, after which she finishes the game. Determine the expected number of coin flips.

### Hint

If Audrey gets tails on her first toss (which has probability $1/2$), then she must start over again. If Audrey gets heads on her first toss, then she can either get $HH$ or $HT$ after her second toss (each with probability $1/4$). If Audrey gets $HT$, then she must start over again. Otherwise, she is finished with the game. 

### 解答

If Audrey gets tails on her first toss (which has probability $1/2$), then she must start over again. If Audrey gets heads on her first toss, then she can either get $HH$ or $HT$ after her second toss (each with probability $1/4$). If Audrey gets $HT$, then she must start over again. Otherwise, she is finished with the game. Let $X$ denote the number of tosses before Audrey finishes the game. From our reasoning above, we can write:
\[\begin{aligned}
    \mathbb{E}[X] &= \frac{1}{2} \left( \mathbb{E}[X] + 1 \right) + \frac{1}{4} \left( \mathbb{E}[X] + 2 \right) + \frac{1}{4} \cdot 2
\end{aligned}\]
We can now solve for $\mathbb{E}[X]$. 
\[\begin{aligned}
    \mathbb{E}[X] &= \frac{6}{4} \cdot 4 = 6
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "vFUmOpYhIFeXQ0aHw3XK",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3244928,
    "randomizable": "",
    "source": "Common question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Repetitious Game I",
    "topic": "probability",
    "urlEnding": "repetitious-game-i"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "vFUmOpYhIFeXQ0aHw3XK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Repetitious Game I",
    "topic": "probability",
    "urlEnding": "repetitious-game-i"
  }
}
```
