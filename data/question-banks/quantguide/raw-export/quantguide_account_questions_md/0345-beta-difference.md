# QuantGuide Question

## 345. Beta Difference

**Metadata**

- ID: `vjrWiK6DeWPWdq5TqG0M`
- URL: https://www.quantguide.io/questions/beta-difference
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Original
- Tags: Continuous Random Variables, Limit Theorems
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,\dots,X_{324},Y_1,\dots,Y_{324} \sim \text{Beta}(1,2)$ IID. Define $S_{324} = X_1 + \dots + X_{324}$ and $T_{324} = Y_1 + \dots + Y_{324}$. Approximate $\mathbb{P}[S_{324} - T_{324} > 10]$. Your answer should be in the form $\Phi(a)$, where $\Phi$ is the standard normal CDF. Find $a$.

### Hint

By the Central Limit Theorem, how can you approximate $S_{324}$ and $T_{324}$? What are their means and variances?

### 解答

Since $S_{324}$ and $T_{324}$ are both comprised of $324$ IID $\text{Beta}(1,2)$ random variables, they are also IID. By the Central Limit Theorem, they are also approximately normally distributed, as they are defined as the sum of a large number of IID random variables. All that remains is to find the mean and variance. We do this for $S_{324}$, but as they are IID, these apply to $T_{324}$ too. 

$$$$

Namely, by Linearity of Expectation and the fact the $X_i$ are IID, we have that $\mathbb{E}[S_{324}] = 324\mathbb{E}[X_1] = 324 \cdot \dfrac{1}{3} = 108$. Furthermore, as the $X_i$ are IID, $\text{Var}(S_{324}) = 324\text{Var}(X_1) = 324 \cdot \dfrac{1}{18} = 18$. Therefore, $S_{324}$ and $T_{324}$ are each well-approximated by independent $N(108,18)$ random variables. As they individually are well-approximated by independent normal random variables, their difference is also well-approximated by a normal random variable. Namely, $S_{324} - T_{324}$ is approximately distributed as $N(108 - 108, 18 + 18)$, which is $N(0,36)$.

$$$$

With all of this in mind, $\mathbb{P}[S_{324} - T_{324} > 10] = \mathbb{P}\left[\dfrac{(S_{324} - T_{324}) - 0}{6} >\dfrac{10}{6}\right]$. The LHS of the interior is now approximately $Z \sim N(0,1)$ distributed, so the approximate probability in question is $\mathbb{P}\left[Z > \dfrac{5}{3}\right] = \mathbb{P}\left[Z \leq -\dfrac{5}{3}\right] = \Phi\left(-\dfrac{5}{3}\right)$. We use symmetry in switching the direction and sign. Therefore, $a = -\dfrac{5}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-5/3"
    ],
    "difficulty": "easy",
    "id": "vjrWiK6DeWPWdq5TqG0M",
    "internalDifficulty": "2",
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2645425,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Beta Difference",
    "topic": "probability",
    "urlEnding": "beta-difference"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "vjrWiK6DeWPWdq5TqG0M",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Beta Difference",
    "topic": "probability",
    "urlEnding": "beta-difference"
  }
}
```
