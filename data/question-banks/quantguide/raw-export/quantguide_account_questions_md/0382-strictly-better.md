# QuantGuide Question

## 382. Strictly Better

**Metadata**

- ID: `XKVRcnEyZFQxoJ5glioA`
- URL: https://www.quantguide.io/questions/strictly-better
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:29:51 America/New_York
- Last Edited By: Gabe

### 题干

Suppose Jimmy and Simon are selecting uniformly random numbers. Jimmy selects from the set $\{1,2,...,1000\}$ and Simon selects from $\{1,2,...,3000\}$. Compute the probability that Simon chooses a strictly larger number than Jimmy

### Hint

You may find it useful to condition on Jimmy's number. How can you use the Law of Total Probability?

### 解答

Let $S$ be Simon's number and $J$ be Jimmy's number. By Law of Total Probability, we have that $\mathbb{P}[S > J] = \displaystyle \sum_{k=1}^{1000} \mathbb{P}[S > J \mid J = k]\mathbb{P}[J=k]$. We have that $\mathbb{P}[J=k] = \dfrac{1}{1000}$ for each $k$ since we choose the number completely at random. If $J = k$, then that means Simon must have a value in the set $\{k+1,\dots, 3000\}$, which contains $3000 - (k+1) + 1= 3000-k$ elements. Therefore, the probability Simon picks a value greater than Jimmy's $k$ is $1 - \dfrac{k}{3000}$. Therefore, we just need to evaluate $\displaystyle \sum_{k=1}^{1000} \dfrac{1}{1000}\left(1 - \dfrac{k}{3000}\right) = 1 - \dfrac{1}{1000 \cdot 3000} \cdot \dfrac{1000(1001)}{2} = 1 - \dfrac{1001}{6000} = \dfrac{4999}{6000}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4999/6000"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XKVRcnEyZFQxoJ5glioA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:29:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2960932,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Strictly Better",
    "topic": "probability",
    "urlEnding": "strictly-better",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "XKVRcnEyZFQxoJ5glioA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Strictly Better",
    "topic": "probability",
    "urlEnding": "strictly-better"
  }
}
```
