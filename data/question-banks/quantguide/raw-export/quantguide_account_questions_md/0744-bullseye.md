# QuantGuide Question

## 744. Bullseye

**Metadata**

- ID: `gSpDtB1sp0g975H8sJ1W`
- URL: https://www.quantguide.io/questions/bullseye
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Discrete Random Variables, Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 19:56:37 America/New_York
- Last Edited By: Gabe

### 题干

Fred throws darts at a dartboard. There is a $10\%$ chance that he hits the bullseye on any given throw, independent between throws. How many throws $n$ must Fred perform to have at least a $90\%$ chance of hitting the bullseye at least once in $n$ throws?

### Hint

The complement is just that he misses the bullseye on each of the $n$ throws. You should get a function $p(n)$ that is increasing in $n$, so find the smallest $n$ such that $p(n) \geq 0.9$.

### 解答

Let's first find the probability Fred lands a bullseye within $n$ throws. The complement is just that he misses the bullseye on each of the $n$ throws. There is a $0.9$ probability per throw that he misses the bullseye. Therefore, the probability of hitting at least once in $n$ throws is $1 - (0.9)^n$. 

$$$$

We want to find an $n$ so that $1 - (0.9)^n \geq 0.9$. Dividing and solving $n \geq \dfrac{\ln(0.1)}{\ln(0.9)} \approx 21.9$. Note that we switch the direction of the inequality since $\ln(0.9) < 0$. We need a whole integer, as there are no partial throws, so $n \geq 22$ is the minimum amount.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "22"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "gSpDtB1sp0g975H8sJ1W",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 19:56:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6100450,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bullseye",
    "topic": "probability",
    "urlEnding": "bullseye",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "gSpDtB1sp0g975H8sJ1W",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bullseye",
    "topic": "probability",
    "urlEnding": "bullseye"
  }
}
```
