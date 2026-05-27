# QuantGuide Question

## 270. Good Grid I

**Metadata**

- ID: `3FVxtUK1Tnac4xdoPwnI`
- URL: https://www.quantguide.io/questions/good-grid-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://aekusbhathal.com/TeachingProblems/CS70_BasicProbability_q.pdf
- Tags: Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 00:32:53 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that two integers $a$ and $b$ are uniformly at random selected from $S = \{-10,-9,\dots, 9,10\}$. Find the probability that $\text{max}\{0,a\} = \text{min}\{0,b\}$.

### Hint

Note that $a \leq 0$, as $\text{min}\{0,b\} \leq 0$.

### 解答

Note that $a \leq 0$, as $\text{min}\{0,b\} \leq 0$. Furthermore, we also see that $b \geq 0$, as $\text{max}\{0,a\} \geq 0$. Therefore, we just need to find the probability $a \leq 0$ and $b \geq 0$. There are $21^2 = 441$ total ways $a$ and $b$ can be selected. Of those, we have $11$ choices for each $a$ and $b$, as $a \leq 0$ and $b \geq 0$, so our probability is just $\dfrac{11^2}{21^2} = \dfrac{121}{441}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "121/441"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3FVxtUK1Tnac4xdoPwnI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:32:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2082769,
    "randomizable": "",
    "source": "https://aekusbhathal.com/TeachingProblems/CS70_BasicProbability_q.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Good Grid I",
    "topic": "probability",
    "urlEnding": "good-grid-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "3FVxtUK1Tnac4xdoPwnI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Good Grid I",
    "topic": "probability",
    "urlEnding": "good-grid-i"
  }
}
```
