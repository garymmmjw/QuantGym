# QuantGuide Question

## 712. Careful Coin Question

**Metadata**

- ID: `hl0qlvFHqPsnjDKCGRmD`
- URL: https://www.quantguide.io/questions/careful-coin-question
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: TQD
- Tags: Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Your friend has a fair coin. They flip it $100$ times consecutively and record the sequence of outcomes. Your goal is to guess the sequence that your friend flipped. You may ask a single Yes/No question to your friend to help you determine the sequence. The maximum probability you can achieve of guessing your friend's sequence is in the form $a^{-b}$ for integers $a$ and $b$, where $b$ is maximal. Find $ab$.

### Hint

Think about fixing some subset $A$ of the sample space of length $100$ sequences.

### 解答

Fix some subset $A$ of the sample space that is non-empty and not the entire sample space. Suppose our question is "Is our sequence $\omega \in A$?" If $|A|$ denotes the number of sequences in $A$, then the probability we guess correctly is $$\dfrac{|A|}{2^{100}} \cdot \dfrac{1}{|A|} + \left(1 - \dfrac{|A|}{2^{100}}\right) \cdot \dfrac{1}{2^{100} - |A|} = \dfrac{2}{2^{100}} = \dfrac{2}{2^{100}} = 2^{-99}$$ Regardless of which subset we restrict to, we get a $2^{-99}$ probability of guessing correctly. Therefore, our answer is $2 \cdot 99 = 198$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "198"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "hl0qlvFHqPsnjDKCGRmD",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5814313,
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Careful Coin Question",
    "topic": "probability",
    "urlEnding": "careful-coin-question"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "hl0qlvFHqPsnjDKCGRmD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Careful Coin Question",
    "topic": "probability",
    "urlEnding": "careful-coin-question"
  }
}
```
