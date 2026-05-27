# QuantGuide Question

## 426. Visible Number of Heads

**Metadata**

- ID: `A4Q8JGk5ZGayDlmagO2V`
- URL: https://www.quantguide.io/questions/visible-number-of-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: DRW, Hudson River Trading
- Source: N/A
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:33:27 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $20$ people whose heights follow some unknown continuous distribution are arranged in a single-file line. We then stand at the front of the line and observe that we can see someone's head if they are taller than everyone that comes before. Let $X$ be the number of visible heads. Compute $\mathbb{E}[X]$? Round to the nearest tenths.

### Hint

Use an indicator random variable for the event that the $i-$th person is the tallest among the first $i$ people. 

### 解答

We decompose $X = X_1 + X_2 + ... + X_{20}$ where we define: 
\[
X_i =
\begin{cases}
1 & \text{if person } i \text{ is taller than everyone before him,} \\
0 & \text{otherwise.}
\end{cases}
\]
We then claim that $E[X_i] = \frac{1}{i}$, since among the first $i$ people, they are all equally likely to be the tallest, so the probability that the $i-$th person is tallest is $\frac{1}{i}$. Then, it follows from Linearity of Expectation that $$\displaystyle \mathbb{E}[X]= \sum_{i=1}^{20} \frac{1}{i}  \approx 3.6$$ For large $n$ (number of people), a good approximation is $\log(n)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.6"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "A4Q8JGk5ZGayDlmagO2V",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:33:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3425930,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Visible Number of Heads",
    "topic": "probability",
    "urlEnding": "visible-number-of-heads",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "easy",
    "id": "A4Q8JGk5ZGayDlmagO2V",
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
    "title": "Visible Number of Heads",
    "topic": "probability",
    "urlEnding": "visible-number-of-heads"
  }
}
```
