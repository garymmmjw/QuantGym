# QuantGuide Question

## 692. Acceptance-Rejection Sampling

**Metadata**

- ID: `N0CgVbltetvdIYF9oSZ9`
- URL: https://www.quantguide.io/questions/acceptancerejection-sampling
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Discrete Random Variables, Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-17 13:10:47 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we want to sample from the PDF of $X \sim \text{Beta}(3,2)$, which has PDF $f(x) = 12x^2(1-x)I_{(0,1)}(x)$. Since you know how to generate uniformly random pairs in the rectangle $R_a = [0,1] \times [0,a]$ for some $a > 0$, you decide to sample from $R_a$. You will count your random point $(X,Y) \in R_a$ as valid for the PDF if it lies in the region bounded by the $x-$axis and $f(x)$. Otherwise, it is rejected. If $a$ is selected to minimize the number of rejected pairs of points per sample, find the expected amount of rejected pairs per accepted pair.

### Hint

We need to find $a$ such that it is closest to $f(x)$. In other words, $a$ is just going to be the maximum of $f(x)$ on $[0,1]$.

### 解答

We need to find $a$ such that it is closest to $f(x)$. In other words, $a$ is just going to be the maximum of $f(x)$ on $[0,1]$. We can quickly see that $f'(x) = 24x - 36x^2 = 12x(2 - 3x)$, so $f'(x) = 0$ when $x = 0,2/3$. One can also see that $x = 0$ is a local minimum and $x = 2/3$ is a local maximum, so $f(x)$ is maximized at $x = 2/3$. This value is $a = f(2/3) = 16/9$. 

$$$$

For any pair $(X,Y)$ that is generated, there is probability $\dfrac{1}{16/9} = \dfrac{9}{16}$ that it is accepted. Therefore, it takes an average of $\dfrac{16}{9}$ generated pair per accepted pair, meaning that there are $\dfrac{7}{9}$ rejected pairs per accepted pair on average.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/9"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "N0CgVbltetvdIYF9oSZ9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 13:10:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5656031,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Acceptance-Rejection Sampling",
    "topic": "probability",
    "urlEnding": "acceptancerejection-sampling",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "N0CgVbltetvdIYF9oSZ9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Acceptance-Rejection Sampling",
    "topic": "probability",
    "urlEnding": "acceptancerejection-sampling"
  }
}
```
