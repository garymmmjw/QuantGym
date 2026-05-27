# QuantGuide Question

## 454. Sum Exceedance III

**Metadata**

- ID: `YnGoKPA247RunO3W6Vdr`
- URL: https://www.quantguide.io/questions/sum-exceedance-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Vatic Labs, Hudson River Trading
- Source: original
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-24 15:56:01 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID and $N_1 = \text{min}\{n : X_1 + \dots + X_n > 1\}$. Let $S_n = X_1 + \dots + X_n$. Compute $\mathbb{E}[S_{N_1}]$. The answer will be in the form $ce$ for a rational number $c$. Find $c$.

### Hint

$$S_{N_1} = \displaystyle \sum_{i=1}^{N_1} X_i$ gives the value of the sum after it exceeds $1$. $N_1$ is a stopping time.

### 解答

By Sum Exceedance I, we know that the expected number of uniforms to exceed $1$ is $e$. Namely, we have that $S_{N_1} = \displaystyle \sum_{i=1}^{N_1} X_i$ gives the value of the sum after it exceeds $1$. As $N_1$ is a stopping time, we can say $\mathbb{E}[S_{N_1}] = \mathbb{E}[N_1]\mathbb{E}[X_i] = \dfrac{e}{2}$. Therefore, $c = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "YnGoKPA247RunO3W6Vdr",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-24 15:56:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3615122,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Exceedance III",
    "topic": "probability",
    "urlEnding": "sum-exceedance-iii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "id": "YnGoKPA247RunO3W6Vdr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Exceedance III",
    "topic": "probability",
    "urlEnding": "sum-exceedance-iii"
  }
}
```
