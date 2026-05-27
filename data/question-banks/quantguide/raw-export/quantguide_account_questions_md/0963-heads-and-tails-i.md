# QuantGuide Question

## 963. Heads and Tails I

**Metadata**

- ID: `UQRBQTPYaSIMy6sYHeVV`
- URL: https://www.quantguide.io/questions/heads-and-tails-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

On average, how many flips of a fair coin will it take until you observe heads immediately followed by tails?

### Hint

If you get tails on your first toss, then you must start over again. If you gets heads on your first toss, then you can either get $HH$ or $HT$ after your second toss. If you get $HT$, then you are done. Otherwise, you only need one more tail to finish the game on the next turn. How can you set up an equation with these cases in mind?

### 解答

If you get tails on your first toss (which has probability $1/2$), then you must start over again. If you gets heads on your first toss, then you can either get $HH$ or $HT$ after your second toss (each with probability $1/4$). If you get $HT$, then you are done. Otherwise, you only need one more tail to finish the game on the next turn. $$$$ To sum up our reasoning, if you flip $H$, then the event of ending up with a $HT$ depends entirely on the event that you get a $T$. This is because if you do \textit{not} get a $T$ on the next flip, then you must get a $H$, which means that you have the same chance to finish the game on the next round. Let $X$ denote the number of flips to get $HT$. Let $Y$ denote the number of flips to get $T$. Thus, we have the following expression:\[\begin{aligned}    \mathbb{E}[X] &= \frac{1}{2}\left( 1 + \mathbb{E}[Y] \right) + \frac{1}{2} \left( \mathbb{E}[X] + 1 \right)\end{aligned}\]Note that\[\begin{aligned}    Y &\sim \text{Geo}(0.5) \\    \Rightarrow \mathbb{E}[Y] &= 2\end{aligned}\]Now, we can solve for $\mathbb{E}[X]$. \[\begin{aligned}    \mathbb{E}[X] &= 2 \left( \frac{3}{2} + \frac{1}{2} \right) = 4\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "medium",
    "id": "UQRBQTPYaSIMy6sYHeVV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7850456,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Heads and Tails I",
    "topic": "probability",
    "urlEnding": "heads-and-tails-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "UQRBQTPYaSIMy6sYHeVV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Heads and Tails I",
    "topic": "probability",
    "urlEnding": "heads-and-tails-i"
  }
}
```
