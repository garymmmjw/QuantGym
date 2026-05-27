# QuantGuide Question

## 184. Greedy Bob

**Metadata**

- ID: `DLievunEqmTpCd29UNZt`
- URL: https://www.quantguide.io/questions/greedy-bob
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 23:30:39 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are playing a game. Alice spins a spinner and wins $X$ dollars, with
mean 12 and variance 2. Bob flips a coin, and if the coin lands on heads, then Bob takes from Alice whatever she won, else Bob wins nothing.  What is $\text{Var}(Y)$, where Y denotes the amount Bob wins?

### Hint

Define an indicator variable for if Bob gets a head. How can this be used to define Y, and what laws of variance can be utilized to solve for V[Y]?

### 解答

Let $I$ of mean 0.5 and variance 0.25 be the indicator variable that denotes if Bob gets a head. Then, $Y = IX$, where $I$ and $X$ are independent. Thus we can write:

$$V[Y] = V[IX] = (V[I]+E[I]^2)(V[X]+E[X]^2) - E[I]^2 E[X]^2$$
$$= (0.25 + 0.25)(2+144) - 0.25\times 144 = 37$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "37"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "DLievunEqmTpCd29UNZt",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 23:30:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1438909,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Greedy Bob",
    "topic": "statistics",
    "urlEnding": "greedy-bob",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "DLievunEqmTpCd29UNZt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Greedy Bob",
    "topic": "statistics",
    "urlEnding": "greedy-bob"
  }
}
```
