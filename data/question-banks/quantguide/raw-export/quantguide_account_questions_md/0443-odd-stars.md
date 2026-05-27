# QuantGuide Question

## 443. Odd Stars

**Metadata**

- ID: `kCAYWMLOyMLyIcbUPsHe`
- URL: https://www.quantguide.io/questions/odd-stars
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 14:03:17 America/New_York
- Last Edited By: Gabe

### 题干

How many non-negative odd integer solutions are there to the equation $x_1 + x_2 + x_3 + x_4 + x_5 + x_6 = 96$? The answer is in the form $\displaystyle \binom{n}{k}$ for $k < \dfrac{n}{2}$. Find $nk$.

### Hint

We can write an odd integer $x$ as $x = 2k + 1$ for some non-negative integer $k$.

### 解答

We can write an odd integer $x$ as $x = 2k + 1$ for some non-negative integer $k$. Thus, let $x_i = 2k_i + 1$ for non-negative integers $k_i$. Then $(2k_1 + 1) + \dots + (2k_6 + 1) = 96$ for $k_i \geq 0$ integers. Rearranging, this is the same as $k_1 + \dots + k_6 = 45$ with $k_i \geq 0$ are integers. There are $\displaystyle \binom{50}{5}$ solutions to this by stars and bars, so our answer is $50 \cdot 5 = 250$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "250"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "kCAYWMLOyMLyIcbUPsHe",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 14:03:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3515170,
    "randomizable": "",
    "source": "gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Stars",
    "topic": "probability",
    "urlEnding": "odd-stars",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "kCAYWMLOyMLyIcbUPsHe",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Stars",
    "topic": "probability",
    "urlEnding": "odd-stars"
  }
}
```
