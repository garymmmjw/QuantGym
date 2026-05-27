# QuantGuide Question

## 610. Car Crash

**Metadata**

- ID: `4BVg7cdIpxlXCp1gpayp`
- URL: https://www.quantguide.io/questions/car-crash
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Citadel, DE Shaw, WorldQuant, Squarepoint Capital, Optiver
- Source: Citadel
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-15 00:15:59 America/New_York
- Last Edited By: Gabe

### 题干

$$N$ employees are driving their individual cars on their way to work at QuantGuide. All cars are reasonably spaced apart, and they all travel at distinct speeds which are randomly assigned. When a faster car catches up to a slower car, it assumes the slower car's speed. After a very long period of time has passed, all $N$ cars have settled into $K$ clusters traveling at distinct speeds. What is the expected value of $K$ when $N = 10$?

### Hint

Let us define an indicator variable $Z_i$ as follows:
\[
\begin{aligned}
    Z_i &= \begin{cases}
        1 & \text{ if there are no slower cars in front of $X_i$} \\
        0 & \text{ otherwise}
    \end{cases}
\end{aligned}
\]
Then, the total number of clusters $K$ is simply $K = \sum_{i = 1}^{N} Z_i$.

### 解答

We can solve this question with linearity of expectation. Let us define an indicator variable $Z_i$ as follows:
\[
\begin{aligned}
    Z_i &= \begin{cases}
        1 & \text{ if there are no slower cars in front of $X_i$} \\
        0 & \text{ otherwise}
    \end{cases}
\end{aligned}
\]
Then, the total number of clusters $K$ is simply $K = \sum_{i = 1}^{N} Z_i$. By linearity of expectation, it follows that $\mathbb{E}[K] = \sum_{i = 1}^{N} \mathbb{E}[Z_i]$.

Consider $Z_N$, the indicator variable corresponding to the car at the front of the pack. No matter what, $Z_N = 1$ since there are no other cars in front of it. Next, let's consider $Z_i$. In this case, there are $N - i$ cars in front of car $X_i$. Including car $X_i$, there are $N - i + 1$ total cars. The probability that $X_i$ is the slowest car among the total $N - i + 1$ cars is simply $\frac{1}{N - i + 1}$. Hence, $\mathbb{E}[Z_i] = \frac{1}{N - i + 1}$. Plugging this in, we find
\[
\begin{aligned}
    \mathbb{E}[K] &= \sum_{i = 1}^{N} \mathbb{E}[Z_i] \\
    &= \sum_{i = 1}^{N} \frac{1}{N - i + 1} \\
    &= 1 + \frac{1}{2} + \frac{1}{3} + \cdots + \frac{1}{N} 
\end{aligned}
\]
When $N = 10$, we compute that 
\[
\begin{aligned}
\mathbb{E}[K] &= \sum_{i = 1}^{10} \frac{1}{i} \\
&= \frac{7381}{2520}
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7381/2520"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "4BVg7cdIpxlXCp1gpayp",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 00:15:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4839571,
    "randomizable": "",
    "source": "Citadel",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Car Crash",
    "topic": "probability",
    "urlEnding": "car-crash",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "hard",
    "id": "4BVg7cdIpxlXCp1gpayp",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Car Crash",
    "topic": "probability",
    "urlEnding": "car-crash"
  }
}
```
