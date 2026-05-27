# QuantGuide Question

## 423. Same Heads

**Metadata**

- ID: `IwgcbnOn9h77dHiUnEsW`
- URL: https://www.quantguide.io/questions/same-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Optiver, SIG
- Source: Kaushik - Optiver Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-6 11:02:15 America/New_York
- Last Edited By: Gabe

### 题干

$$2$ people flip a fair coin $4$ times each and record their flips. What is the probability that the two people flipped the same number of heads?


### Hint

Find the probability of just one person getting each number of heads.

### 解答

To solve this question, we first need to find the probability that each player gets each number of heads. We can use the binomial formula for this. 
$$$$
$$\mathbb{P}[0 \text{ heads}]=\left(\frac{1}{2}\right)^4=\frac{1}{16}$$
$$$$
$$\mathbb{P}(1 \text{ head})=\binom{4}{1}\left(\frac{1}{2}\right)^4=\frac{1}{4}$$
$$$$
$$\mathbb{P}(2 \text{ heads})=\binom{4}{2}\left(\frac{1}{2}\right)^4=\frac{3}{8}$$
$$$$
$$\mathbb{P}(3 \text{ heads})=\binom{4}{3}\left(\frac{1}{2}\right)^4=\frac{1}{4}$$
$$$$
$$\mathbb{P}(4 \text{ heads})=\left(\frac{1}{2}\right)^4=\frac{1}{16}$$
$$$$
Since the probability of rolling a certain amount of heads is independent for the two people, we can just square all these probabilities to find the probability that two people get the same number of heads. 
$$$$
$$\mathbb{P}(0 \text{ heads for both})=\left(\frac{1}{16}\right)^2=\frac{1}{256}$$
$$$$
$$\mathbb{P}(1 \text{ head for both})=\left(\frac{1}{4}\right)^2=\frac{1}{16}$$
$$$$
$$\mathbb{P}(2 \text{ heads for both})=\left(\frac{3}{8}\right)^2=\frac{9}{64}$$
$$$$
$$\mathbb{P}(3 \text{ heads for both})=\left(\frac{1}{4}\right)^2=\frac{1}{16}$$
$$$$
$$\mathbb{P}(4 \text{ heads for both})=\left(\frac{1}{16}\right)^2=\frac{1}{256}$$
$$$$
Summing up these probabilities, we get $$\mathbb{P}(\text{same \# of heads})=2 \cdot \frac{1}{256}+2 \cdot \frac{1}{16}+\frac{9}{64}=\frac{35}{128}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "35/128"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "IwgcbnOn9h77dHiUnEsW",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 11:02:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3395286,
    "source": "Kaushik - Optiver Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Same Heads",
    "topic": "probability",
    "urlEnding": "same-heads",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "IwgcbnOn9h77dHiUnEsW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Same Heads",
    "topic": "probability",
    "urlEnding": "same-heads"
  }
}
```
