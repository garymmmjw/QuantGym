# QuantGuide Question

## 840. Clockwise Murder

**Metadata**

- ID: `GvBEMmqfP6KoxUKtskSE`
- URL: https://www.quantguide.io/questions/clockwise-murder
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: https://puzzles.nigelcoldwell.co.uk/sixtyfour.htm
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

There are $N$ people standing in a circle labeled 1 through $N$, such that the smallest power of two less than or equal to $N$ is $X$. Starting with the person 1, they take a sword and kill the person to their left. Then, they pass the sword to the living person on their left, and the process continues until one person is left. The survivor's number can be expressed as $aN + bX + c$. Compute $a + 2b + 3c$. 

### Hint

Notice that person 1 will always win if there are a total of $2^k$ people. What if it is not a power of $2$?

### 解答

Notice that person 1 will always win if there are a total of $2^k$ people. This is because powers of 2 can halve without a remainder. If $N$ is not a power of 2, then we simply need to eliminate the first $N - X$ people. The number of the person begins when there are $X$ total people left will win. Starting with player 1, we eliminate $N - X$ people, meaning that we kill every even-numbered player until $2(N - X)$, inclusive. Our survivor is therefore numbered $2(N - X) + 1 = 2N - 2X + 1$. Hence, $a + 2b + 3c = 1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "hard",
    "id": "GvBEMmqfP6KoxUKtskSE",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6890890,
    "source": "https://puzzles.nigelcoldwell.co.uk/sixtyfour.htm",
    "status": "published",
    "tags": [],
    "title": "Clockwise Murder",
    "topic": "brainteasers",
    "urlEnding": "clockwise-murder"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "GvBEMmqfP6KoxUKtskSE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Clockwise Murder",
    "topic": "brainteasers",
    "urlEnding": "clockwise-murder"
  }
}
```
