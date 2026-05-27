# QuantGuide Question

## 637. 30 Side Difference

**Metadata**

- ID: `aNXybaiS2DSJUrkwHV4z`
- URL: https://www.quantguide.io/questions/30-side-difference
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, DRW
- Source: js
- Tags: Combinatorics, Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 10:22:01 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be the upfaces of two independent rolls of fair $30-$sided dice with values $1-30$ on the sides. Find $\mathbb{E}[|X-Y|]$.

### Hint

Let $Z = |X-Y|$. Compute the PMF of $Z$ directly. If the absolute difference between the rolls is exactly $k$, then what form are in the outcomes in?

### 解答

Let $Z = |X-Y|$. We are going to compute the PMF of $Z$ directly. We know that there are a total of $30^2 = 900$ possible outcomes for the rolls. Now, for a fixed $k$, we want to find the number of outcomes satisfying $\{Z = k\}$. 

$$$$

If the absolute difference between the rolls is exactly $k$, then the outcomes are in the form $(i,i+k)$ for some appropriate $i$. What is the range of $i$ we can have? Namely, we know that $i \geq 1$, as that is the minimal possible value of the die. The upper bound is $i = 30-k$, as that would correspond to the pair $(30-k,30)$. We can permute the values to either of the $2$ dice, so there are $2(30-k)$ outcomes corresponding to $\{Z=k\}$ Therefore, $$\mathbb{E}[Z] = \displaystyle \sum_{k=0}^{29} k \cdot \dfrac{2(30-k)}{900} = \dfrac{1}{450} \sum_{k=1}^{29} 30k - k^2 = \dfrac{1}{450}\left(\dfrac{30(29)(30)}{2} - \dfrac{29(30)(59)}{6}\right) = \dfrac{899}{90}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "899/90"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "aNXybaiS2DSJUrkwHV4z",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 10:22:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5076059,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "30 Side Difference",
    "topic": "probability",
    "urlEnding": "30-side-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "aNXybaiS2DSJUrkwHV4z",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "30 Side Difference",
    "topic": "probability",
    "urlEnding": "30-side-difference"
  }
}
```
