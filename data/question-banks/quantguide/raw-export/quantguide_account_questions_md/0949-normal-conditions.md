# QuantGuide Question

## 949. Normal Conditions

**Metadata**

- ID: `x2xq4VlKZAkldNFtHxvm`
- URL: https://www.quantguide.io/questions/normal-conditions
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Two Sigma, DE Shaw, Jane Street, Citadel, Akuna
- Source: N/A
- Tags: Continuous Random Variables, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 13:06:58 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1 \sim N(0,9)$ and $X_2 \sim N(0,16)$ are independent. Compute $\mathbb{E}[X_1 \mid X_1 + X_2 = 5]$.

### Hint

Compute the conditional distribution of $X_1 \mid X_1 + X_2 = 5$ and note that if $X_1 = x$, $X_2 = 5 - x$.

### 解答

Let $\phi_1$ and $\phi_2$ be the PDFs of $X_1$ and $X_2$, respectively. We know that as $X_1$ and $X_2$ are independent, $X_1 + X_2 \sim N(0,25)$, as we just add the variances. We now compute the conditional distribution of $X_1 \mid X_1 + X_2 = 5$. By the conditional PDF formula, we know that $$f_{X_1 \mid X_1  + X_2  = 5}(x) = \dfrac{f_{X_1,X_1 + X_2}(x,5)}{f_{X_1+X_2}(5)}$$ The numerator here can be greatly simplified by noting that if $X_1 = x$, then $X_2 = 5 - x$ so that we get a sum of $5$. Therefore, $f_{X_1,X_1+X_2}(x,5) = \phi_1(x)\phi_2(5-x)$. 

$$$$

Plugging all of the PDFs in, $$f_{X_1 \mid X_1 + X_2 = 5}(x) = \dfrac{\dfrac{1}{3\sqrt{2\pi}} e^{-\frac{x^2}{18}} \cdot \dfrac{1}{4\sqrt{2\pi}}e^{-\frac{(5-x)^2}{32}}}{\dfrac{1}{5\sqrt{2\pi}}e^{-\frac{25}{50}}}$$

After doing a good amount of simplification, you will note that $X_1 \mid X_1 + X_2 = 5 \sim N\left(\dfrac{9}{5},\dfrac{144}{25}\right)$. In particular, this means the mean is $\dfrac{9}{5}$, and we are done. You can also reason this answer intuitively as you would expect the contribution from each normal to be  in proportion with the variance, so we are really saying that $\dfrac{9}{9 + 16} \cdot 5$ comes from the normal with variance $9$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/5",
      "1.8"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "x2xq4VlKZAkldNFtHxvm",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:06:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7751958,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Normal Conditions",
    "topic": "probability",
    "urlEnding": "normal-conditions",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "x2xq4VlKZAkldNFtHxvm",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Normal Conditions",
    "topic": "probability",
    "urlEnding": "normal-conditions"
  }
}
```
